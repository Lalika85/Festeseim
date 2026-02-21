import React, { createContext, useContext, useEffect, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { db } from '../services/firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useProjects } from '../hooks/useProjects';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const { projects } = useProjects();
    const isInitialLoad = useRef(true);
    const settings = useRef({ upcomingWork: true, quoteAccepted: true, newWorkAssigned: true });

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
                name: 'Fontos Értesítések',
                importance: 5,
                description: 'Árajánlat elfogadva és egyéb fontos események',
                sound: 'beep.wav',
                visibility: 1,
                vibration: true
            });
        } catch (e) {
            console.warn('Channel creation failed', e);
        }
    };

    const scheduleNotification = async (title, body, id = Math.floor(Math.random() * 100000)) => {
        try {
            await createChannel();
            const perm = await LocalNotifications.checkPermissions();
            if (perm.display !== 'granted') {
                logToStorage('Permission not granted', 'warn');
                return;
            }

            const scheduleAt = new Date(Date.now() + 2000);
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title, body, id,
                        channelId: 'default',
                        schedule: { at: scheduleAt },
                        sound: 'beep.wav'
                    }
                ]
            });
            logToStorage(`Scheduled: ${title}`, 'success');
        } catch (e) {
            logToStorage(`Schedule error: ${e.message}`, 'error');
        }
    };

    const sendTestNotification = async () => {
        await createChannel();
        await requestPermissions();
        await scheduleNotification("Teszt Értesítés 🔔", "Ez egy visszajelzés, hogy a telefonod értesítési rendszere működik.");
        showToast("Teszt értesítés kiküldve!", "info");
    };

    // 1. Settings listener
    useEffect(() => {
        if (!currentUser) return;
        const unsub = onSnapshot(doc(db, 'users', currentUser.uid, 'settings', 'notifications'), (snap) => {
            if (snap.exists()) {
                settings.current = snap.data();
            }
        });
        return () => unsub();
    }, [currentUser]);

    // 2. Quote acceptance observer
    useEffect(() => {
        if (!currentUser) return;

        const path = `users/${currentUser.uid}/quotes`;
        logToStorage(`Observer: Starting on ${path}`, 'info');

        const q = collection(db, 'users', currentUser.uid, 'quotes');

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const persistentIds = new Set(JSON.parse(localStorage.getItem('notified_quote_ids') || '[]'));

            if (isInitialLoad.current) {
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'accepted') persistentIds.add(doc.id);
                });
                localStorage.setItem('notified_quote_ids', JSON.stringify(Array.from(persistentIds)));
                isInitialLoad.current = false;
                logToStorage(`Observer ready.`, 'success');
                return;
            }

            if (!settings.current.quoteAccepted) return;

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    const quote = change.doc.data();
                    const qId = change.doc.id;

                    if (quote.status === 'accepted' && !persistentIds.has(qId)) {
                        logToStorage(`Elfogadva: ${quote.number}`, 'success');
                        scheduleNotification(
                            "Árajánlat elfogadva! 🎉",
                            `${quote.buyerName ?? 'Ügyfél'} elfogadta a(z) ${quote.number ?? ''} számú ajánlatot.`
                        );
                        showToast(`${quote.buyerName ?? 'Ügyfél'} elfogadta az ajánlatot!`, 'success');
                        persistentIds.add(qId);
                        localStorage.setItem('notified_quote_ids', JSON.stringify(Array.from(persistentIds)));
                    }
                }
            });
        }, (error) => {
            logToStorage(`Error: ${error.message}`, 'error');
        });

        const listenerPromise = LocalNotifications.addListener('localNotificationReceived', (n) => {
            logToStorage(`Foreground: ${n.title}`, 'info');
        });

        // 4. Generic Notifications Observer (New Member, Work Assigned)
        const notifPath = `users/${currentUser.uid}/notifications`;
        const notifQ = collection(db, 'users', currentUser.uid, 'notifications');

        const unsubscribeNotifs = onSnapshot(notifQ, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();

                    // Skip if initial load or already read
                    if (data.read || isInitialLoad.current) return;

                    logToStorage(`New Notification: ${data.title}`, 'success');
                    scheduleNotification(data.title, data.body);
                    showToast(data.title, 'info');
                }
            });
        });

        return () => {
            unsubscribe();
            unsubscribeNotifs();
            listenerPromise.then(h => {
                if (h && typeof h.remove === 'function') {
                    h.remove();
                }
            }).catch(err => console.warn("Listener removal failed", err));
        };
    }, [currentUser]);

    // 3. Tomorrow's work check
    useEffect(() => {
        if (!currentUser || projects.length === 0) return;

        const checkUpcomingJobs = async () => {
            if (!settings.current.upcomingWork) return;
            const todayStr = new Date().toISOString().split('T')[0];
            if (localStorage.getItem('last_tomorrow_work_notify_date') === todayStr) return;

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            const tomorrowJobs = projects.filter(p => p.start && p.end && tomorrowStr >= p.start && tomorrowStr <= p.end);

            if (tomorrowJobs.length > 0) {
                const jobNames = tomorrowJobs.map(j => j.client).slice(0, 3).join(', ');
                await scheduleNotification("Munkák holnapra 📅", `Holnap ${tomorrowJobs.length} munkád van: ${jobNames}`);
                localStorage.setItem('last_tomorrow_work_notify_date', todayStr);
            }
        };

        checkUpcomingJobs();
    }, [currentUser, projects.length]);

    return (
        <NotificationContext.Provider value={{ requestPermissions, sendTestNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};
