import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useProjects } from '../hooks/useProjects';
import { localDB } from '../services/localDB';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { currentUser, ownerUid } = useAuth();
    const { showToast } = useToast();
    const { projects } = useProjects();
    const [settings, setSettings] = useState({
        upcomingWork: true,
        notifyJobStart: true,
        startLeadTime: '1d',
        notifyDeadline: true,
        endLeadTime: '1d'
    });

    // --- DIAGNOSTIC LOGGER ---
    const logToStorage = (message, type = 'info') => {
        try {
            let logsRaw = localStorage.getItem('notification_logs');
            let logs = [];
            try {
                logs = JSON.parse(logsRaw || '[]');
            } catch (e) {
                localStorage.removeItem('notification_logs');
            }
            const newLog = {
                timestamp: new Date().toLocaleTimeString(),
                message,
                type
            };
            localStorage.setItem('notification_logs', JSON.stringify([newLog, ...logs].slice(0, 50)));
        } catch (e) {
            console.error('Logging failed', e);
        }
    };

    const requestPermissions = async () => {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
            await LocalNotifications.requestPermissions();
        }
    };

    const createChannel = async () => {
        try {
            await LocalNotifications.createChannel({
                id: 'default',
                name: 'Munkanapló Értesítések',
                importance: 5,
                description: 'Munka kezdete és határidő emlékeztetők',
                sound: 'beep.wav',
                visibility: 1,
                vibration: true
            });
        } catch (e) {
            console.warn('Channel creation failed', e);
        }
    };

    const scheduleNotification = async (title, body, id, at) => {
        try {
            await createChannel();
            const perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') {
                logToStorage('Engedély megtagadva', 'warn');
                return;
            }

            // Only schedule if 'at' is in the future
            if (at && at < new Date()) {
                return;
            }

            // Ensure id is a number, default to randomly generated for tests if missing
            const notificationId = typeof id === 'number' ? id : Math.floor(Math.random() * 2147483647);
            
            const notification = {
                title: title || "Értesítés",
                body: body || "",
                id: notificationId,
                channelId: 'default',
                schedule: { at: at || new Date(Date.now() + 2000) },
                sound: 'beep.wav'
            };

            await LocalNotifications.schedule({
                notifications: [notification]
            });

            if (at) {
                logToStorage(`Ütemezve: ${title} (${at.toLocaleString()})`, 'success');
            } else {
                logToStorage(`Azonnali értesítés: ${title}`, 'success');
            }
        } catch (e) {
            logToStorage(`Hiba az ütemezésnél: ${e.message}`, 'error');
            console.error("Notification scheduling error:", e);
        }
    };

    const sendTestNotification = async () => {
        await createChannel();
        await requestPermissions();
        await scheduleNotification("Teszt Értesítés 🔔", "Az értesítési rendszer megfelelően működik.");
        showToast("Teszt értesítés kiküldve!", "info");
    };

    // Load settings from localDB
    useEffect(() => {
        if (!ownerUid) return;
        const unsub = localDB.subscribe(ownerUid, 'settings', (data) => {
            if (data && data.notifications) {
                setSettings(prev => ({ ...prev, ...data.notifications }));
            }
        });
        return () => unsub();
    }, [ownerUid]);

    // Main Scheduling Logic
    useEffect(() => {
        if (!ownerUid || projects.length === 0) return;

        const syncReminders = async () => {
            // 1. Cancel all existing notification to avoid duplicates
            try {
                const pending = await LocalNotifications.getPending();
                if (pending.notifications.length > 0) {
                    await LocalNotifications.cancel(pending);
                }
            } catch (e) {
                console.warn("Could not cancel pending notifications", e);
            }

            if (!settings.upcomingWork) return;

            const leadTimeMs = {
                '1h': 3600000,
                '3h': 10800000,
                '1d': 86400000,
                '2d': 172800000,
                '1w': 604800000
            };

            projects.forEach(project => {
                if (!project.id) return;
                
                // IDs must be numeric 32-bit. Project IDs are strings with timestamps usually.
                const baseId = parseInt(String(project.id).slice(-7)) || Math.floor(Math.random() * 1000000);

                // --- Job Start Reminder ---
                if (settings.notifyJobStart && project.start) {
                    const startTime = new Date(project.start);
                    startTime.setHours(8, 0, 0, 0); // Default to 8 AM on start day
                    const notifyAt = new Date(startTime.getTime() - (leadTimeMs[settings.startLeadTime] || leadTimeMs['1d']));
                    
                    if (notifyAt > new Date()) {
                        scheduleNotification(
                            "Hamarosan kezdés! 🚀",
                            `Munka kezdődik: ${project.client || 'Ismeretlen'} (${project.location || ''})`,
                            baseId * 10 + 1,
                            notifyAt
                        );
                    }
                }

                // --- Deadline Reminder ---
                if (settings.notifyDeadline && project.end) {
                    const endTime = new Date(project.end);
                    endTime.setHours(17, 0, 0, 0); // Default to 5 PM on end day
                    const notifyAt = new Date(endTime.getTime() - (leadTimeMs[settings.endLeadTime] || leadTimeMs['1d']));
                    
                    if (notifyAt > new Date()) {
                        scheduleNotification(
                            "Határidő közeledik! ⏳",
                            `Befejezési határidő: ${project.client || 'Ismeretlen'}`,
                            baseId * 10 + 2,
                            notifyAt
                        );
                    }
                }
            });
        };

        syncReminders();
    }, [ownerUid, projects, settings]);

    return (
        <NotificationContext.Provider value={{ requestPermissions, sendTestNotification, settings }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};
