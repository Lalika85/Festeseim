import React, { createContext, useContext, useState, useEffect } from 'react';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { useAuth } from '../hooks/useAuth';
import { useProjects } from '../hooks/useProjects';
import { Capacitor } from '@capacitor/core';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const SubscriptionContext = createContext();

export const SubscriptionProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const { projects } = useProjects();
    const [isPremium, setIsPremium] = useState(false);
    const [offerings, setOfferings] = useState(null);
    const [loading, setLoading] = useState(true);

    // Real RevenueCat API Key
    const REVENUECAT_API_KEY = "goog_gpvrjOIbRvgRJQIezXvJMlpFcwG"; 

    useEffect(() => {
        let unsubFirestore = () => {};

        const initPurchases = async () => {
            // FOR TESTING PHASE: Force premium for everyone immediately
            setIsPremium(true);
            setLoading(false);

            if (!Capacitor.isNativePlatform()) {
                console.log("Subscription: Web mode");
            } else {
                try {
                    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
                    await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: currentUser?.uid });
                    
                    const currentOfferings = await Purchases.getOfferings();
                    setOfferings(currentOfferings.offerings);
                } catch (e) {
                    console.error("RevenueCat Init Error:", e);
                }
            }
        };

        if (currentUser) {
            initPurchases();
        } else {
            setIsPremium(false);
            setLoading(false);
        }

        return () => {
            unsubFirestore();
        }
    }, [currentUser]);

    const purchasePackage = async (pack) => {
        try {
            await Purchases.purchasePackage({ package: pack });
            return true;
        } catch (error) {
            if (!error.userCancelled) {
                console.error("Purchase Error:", error);
            }
            return false;
        }
    };

    const restorePurchases = async () => {
        try {
            await Purchases.restorePurchases();
            return true;
        } catch (error) {
            console.error("Restore Error:", error);
            return false;
        }
    };

    const clientCount = projects?.length || 0;
    const hasReachedLimit = !isPremium && clientCount >= 5;

    return (
        <SubscriptionContext.Provider value={{
            isPremium,
            offerings,
            loading,
            purchasePackage,
            restorePurchases,
            clientCount,
            hasReachedLimit
        }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => useContext(SubscriptionContext);
