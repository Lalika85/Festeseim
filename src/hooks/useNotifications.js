import { useEffect, useRef, useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { localDB } from '../services/localDB';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export const useNotifications = (projects = []) => {
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const lastQuoteIds = useRef(new Set());
    const isInitialLoad = useRef(true);
    const settings = useRef({ upcomingWork: true, quoteAccepted: true });

    // --- DIAGNOSTIC LOGGER ---
    const logToStorage = (message, type = 'info') => {
        try {
            let logsRaw = localStorage.getItem('notification_logs');
            let logs = [];
            try {
                logs = JSON.parse(logsRaw || '[]');
            } catch (e) {
                localStorage.removeItem('notification_logs'); // Reset if corrupted
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
    // -------------------------

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
            await createChannel(); // Ensure channel exists
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
            console.log('Notification scheduled:', title);
        } catch (e) {
            logToStorage(`Schedule error: ${e.message}`, 'error');
            console.error('Notification schedule error', e);
        }
    };

    // 1. Listen for notification settings
    useEffect(() => {
        if (!currentUser) return;
        const unsub = localDB.subscribe(currentUser.uid, 'settings', (data) => {
            if (data && data.notifications) {
                settings.current = { ...settings.current, ...data.notifications };
            }
        });
        return () => unsub();
    }, [currentUser]);

    // 2. Monitor for newly accepted quotes locally
    useEffect(() => {
        logToStorage(`Hook debug: Mounted (uid: ${currentUser?.uid?.slice(0, 5) || 'none'})`, 'info');
        if (!currentUser) return;

        logToStorage('Observer: Connecting...', 'info');

        const persistentIds = new Set(JSON.parse(localStorage.getItem('notified_quote_ids') || '[]'));

        const unsubscribe = localDB.subscribe(currentUser.uid, 'quotes', (data) => {
            const quotes = Object.values(data || {});
            logToStorage(`LocalDB: Received (${quotes.length} docs)`, 'info');

            if (isInitialLoad.current) {
                // Mark current accepted as notified
                quotes.forEach(quote => {
                    if (quote.status === 'accepted') {
                        persistentIds.add(quote.id);
                    }
                });
                localStorage.setItem('notified_quote_ids', JSON.stringify(Array.from(persistentIds)));
                isInitialLoad.current = false;
                logToStorage(`Observer ready. Session tracking active.`, 'success');
                return;
            }

            if (!settings.current.quoteAccepted) return;

            quotes.forEach((quote) => {
                if (quote.status === 'accepted') {
                    if (!persistentIds.has(quote.id)) {
                        logToStorage(`Acceptance detected: ${quote.number}`, 'success');

                        scheduleNotification(
                            "Árajánlat elfogadva! 🎉",
                            `${quote.buyerName ?? 'Egy ügyfél'} elfogadta a(z) ${quote.number ?? ''} számú ajánlatot.`
                        );

                        showToast(`Szuper! ${quote.buyerName ?? 'Ügyfél'} elfogadta az ajánlatot!`, 'success');

                        persistentIds.add(quote.id);
                        localStorage.setItem('notified_quote_ids', JSON.stringify(Array.from(persistentIds)));
                    }
                }
            });
        });

        const listener = LocalNotifications.addListener('localNotificationReceived', (notification) => {
            logToStorage(`Foreground notify: ${notification.title}`, 'info');
        });

        return () => {
            unsubscribe();
            listener.remove();
        };
    }, [currentUser]);

    const sendTestNotification = async () => {
        await createChannel();
        await requestPermissions();
        await scheduleNotification("Teszt Értesítés 🔔", "Ez egy visszajelzés, hogy a telefonod értesítési rendszere működik.");
        showToast("Teszt értesítés kiküldve!", "info");
    };

    // 3. Daily check for tomorrow's projects
    useEffect(() => {
        if (!currentUser || projects.length === 0) return;

        const checkUpcomingJobs = async () => {
            if (!settings.current.upcomingWork) return;

            const todayStr = new Date().toISOString().split('T')[0];
            const lastCheckDate = localStorage.getItem('last_tomorrow_work_notify_date');

            if (lastCheckDate === todayStr) {
                console.log('Notification Engine: Tomorrow work already notified today. Skipping.');
                return;
            }

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            const tomorrowJobs = projects.filter(p =>
                p.start && p.end &&
                tomorrowStr >= p.start &&
                tomorrowStr <= p.end
            );

            if (tomorrowJobs.length > 0) {
                const jobNames = tomorrowJobs.map(j => j.client).slice(0, 3).join(', ');
                const more = tomorrowJobs.length > 3 ? '...' : '';

                await scheduleNotification(
                    "Munkák holnapra 📅",
                    `Holnap ${tomorrowJobs.length} munkád van folyamatban: ${jobNames}${more}`
                );

                localStorage.setItem('last_tomorrow_work_notify_date', todayStr);
            }
        };

        createChannel().then(() => {
            checkUpcomingJobs();
            requestPermissions();
        });
    }, [currentUser, projects.length]);

    return { requestPermissions, sendTestNotification };
};
