const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// RevenueCat Webhook Endpoint
exports.revenueCatWebhook = functions.https.onRequest(async (req, res) => {
    // Only accept POST requests
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const event = req.body.event;

        if (!event || !event.app_user_id) {
            res.status(400).send("Bad Request: Missing event data");
            return;
        }

        const uid = event.app_user_id;
        const eventType = event.type;
        const entitlementIds = event.entitlement_ids || [];

        // Check if the event concerns the 'premium' entitlement
        const hasPremiumEntitlement = entitlementIds.includes("premium") || entitlementIds.includes("pro");

        console.log(`Received RevenueCat event: ${eventType} for UID: ${uid}`);

        let isPremium = null;

        // Events that grant or confirm active access
        if (["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION"].includes(eventType)) {
            if (hasPremiumEntitlement) {
                isPremium = true;
            }
        } 
        // Events that revoke access
        // Note: 'CANCELLATION' just means they turned off auto-renew. They still have access until 'EXPIRATION'.
        // Voided purchases / Refunds also trigger 'EXPIRATION' immediately.
        else if (["EXPIRATION"].includes(eventType)) {
            if (hasPremiumEntitlement) {
                isPremium = false;
            }
        }

        // If we determined a state change, update Firestore
        if (isPremium !== null) {
            console.log(`Updating UID: ${uid} isPremium to ${isPremium}`);
            await db.collection("users").doc(uid).set(
                { isPremium: isPremium },
                { merge: true }
            );
        }

        // Acknowledge receipt to RevenueCat
        res.status(200).send("OK");
    } catch (error) {
        console.error("Error processing RevenueCat webhook:", error);
        res.status(500).send("Internal Server Error");
    }
});
