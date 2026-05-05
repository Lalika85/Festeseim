import { SecureStorage } from '@aparajita/capacitor-secure-storage';

class LocalDB {
    constructor() {
        this.listeners = new Map();
        this.cachedPin = null;
        this.isSecureStorageInitialized = false;
    }

    async initSecureStorage() {
        try {
            // First check if a pin exists in Secure Storage
            const { value } = await SecureStorage.get({ key: 'app_pin' });
            this.cachedPin = value;
        } catch (e) {
            // SecureStoragePlugin throws if key doesn't exist
            this.cachedPin = null;

            // Migration logic: If there's a PIN in localStorage, move it to Secure Storage
            const legacyPin = localStorage.getItem('app_pin');
            if (legacyPin) {
                try {
                    await SecureStorage.set({ key: 'app_pin', value: legacyPin });
                    this.cachedPin = legacyPin;
                    localStorage.removeItem('app_pin');
                    console.log("Migrated app_pin to Secure Storage");
                } catch (migrationErr) {
                    console.error("Migration to Secure Storage failed", migrationErr);
                }
            }
        }
        this.isSecureStorageInitialized = true;
    }

    async setAppPin(pin) {
        try {
            await SecureStorage.set({ key: 'app_pin', value: pin });
            this.cachedPin = pin;
        } catch (e) {
            console.error("Failed to set secure pin", e);
            throw e;
        }
    }

    async removeAppPin() {
        try {
            await SecureStorage.remove({ key: 'app_pin' });
            this.cachedPin = null;
        } catch (e) {
            console.error("Failed to remove secure pin", e);
            throw e;
        }
    }

    _getKey(uid, collectionName) {
        return `db_${uid}_${collectionName}`;
    }

    _triggerEvent(key) {
        if (this.listeners.has(key)) {
            const data = this._loadRaw(key);
            this.listeners.get(key).forEach(callback => callback(data));
        }
    }

    // Simple XOR obfuscation using PIN as key (not military grade, but stops casual lookers)
    _obfuscate(text, key) {
        if (!key) return text;
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const keyData = encoder.encode(key);
            const result = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) {
                result[i] = data[i] ^ keyData[i % keyData.length];
            }
            // Safely convert binary to base64
            let binary = '';
            const len = result.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(result[i]);
            }
            return btoa(binary);
        } catch (e) {
            console.error("Obfuscation error:", e);
            return text;
        }
    }

    _deobfuscate(encoded, key) {
        if (!key) return encoded;
        try {
            const binary = atob(encoded);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            
            const encoder = new TextEncoder();
            const keyData = encoder.encode(key);
            const result = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) {
                result[i] = bytes[i] ^ keyData[i % keyData.length];
            }
            
            const decoder = new TextDecoder();
            return decoder.decode(result);
        } catch (e) {
            console.error("Deobfuscation error:", e);
            return encoded;
        }
    }

    _loadRaw(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return {};
            const pin = this.cachedPin;
            const json = pin ? this._deobfuscate(raw, pin) : raw;
            return JSON.parse(json);
        } catch (e) {
            console.error("LocalDB read error", e);
            return {};
        }
    }

    _saveRaw(key, data) {
        try {
            const json = JSON.stringify(data);
            const pin = this.cachedPin;
            const storedValue = pin ? this._obfuscate(json, pin) : json;
            localStorage.setItem(key, storedValue);
            this._triggerEvent(key);
        } catch (e) {
            console.error("LocalDB write error", e);
        }
    }

    // Call this when PIN is changed to re-encrypt all keys
    reEncrypt(oldPin, newPin) {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('db_')) {
                const raw = localStorage.getItem(key);
                const json = oldPin ? this._deobfuscate(raw, oldPin) : raw;
                try {
                   const data = JSON.parse(json);
                   const newRaw = newPin ? this._obfuscate(JSON.stringify(data), newPin) : JSON.stringify(data);
                   localStorage.setItem(key, newRaw);
                } catch(e) {
                   console.warn("Skipping key during re-encryption", key);
                }
            }
        }
    }

    // Subscribe to a collection or a specific document. Mimics onSnapshot.
    // Call with specific docId if watching a single setting, else omit docId.
    subscribe(uid, collectionName, callback) {
        if (!uid) return () => {}; // No-op unsubscribe
        const key = this._getKey(uid, collectionName);
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);

        // Initial trigger
        callback(this._loadRaw(key));

        return () => { // unsubscribe function
            if (this.listeners.has(key)) {
                this.listeners.get(key).delete(callback);
            }
        };
    }

    // List all
    getAll(uid, collectionName) {
        if (!uid) return [];
        const key = this._getKey(uid, collectionName);
        const data = this._loadRaw(key);
        return Object.values(data);
    }
    
    // Get doc
    get(uid, collectionName, docId) {
        if (!uid) return null;
        const key = this._getKey(uid, collectionName);
        const data = this._loadRaw(key);
        return data[docId] || null;
    }

    // Set doc (create or update full)
    set(uid, collectionName, docId, payload) {
        if (!uid) return;
        const key = this._getKey(uid, collectionName);
        const data = this._loadRaw(key);
        // Merge with existing data if it exists
        data[docId] = { 
            ...(data[docId] || {}), 
            ...payload, 
            id: docId,
            updatedAt: new Date().toISOString()
        };
        this._saveRaw(key, data);
    }

    // Replace doc (destructive update)
    replace(uid, collectionName, docId, payload) {
        if (!uid) return;
        const key = this._getKey(uid, collectionName);
        const data = this._loadRaw(key);
        data[docId] = { ...payload, id: docId, updatedAt: new Date().toISOString() };
        this._saveRaw(key, data);
    }

    // Delete doc
    remove(uid, collectionName, docId) {
        if (!uid) return;
        const key = this._getKey(uid, collectionName);
        const data = this._loadRaw(key);
        if (data[docId]) {
            delete data[docId];
            this._saveRaw(key, data);
        }
    }
}

// NOTE: localStorage is typically limited to ~5-10MB. 
// For larger data (many photos), we might eventually need Capacitor Filesystem.
export const localDB = new LocalDB();
