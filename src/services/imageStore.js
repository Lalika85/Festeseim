import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

const IMAGE_DIR = 'logos';

/**
 * Service to handle image persistence on the device filesystem.
 * This bypasses the 5MB localStorage limit for high-resolution logos.
 */
export const imageStore = {
    /**
     * Saves a base64 image to the filesystem.
     * @param {string} base64Data Full data URL or raw base64
     * @param {string} fileName Target filename (e.g. company_123.png)
     * @returns {Promise<string>} The storage URI or base64 fallback
     */
    async saveImage(base64Data, fileName) {
        if (!base64Data) return null;
        
        // On web/dev environment, we keep using base64 due to lack of Filesystem
        if (!Capacitor.isNativePlatform()) {
            return base64Data;
        }

        try {
            // Ensure directory exists
            try {
                await Filesystem.mkdir({
                    path: IMAGE_DIR,
                    directory: Directory.Data,
                    recursive: true
                });
            } catch (e) {
                // Directory likely exists
            }

            // Clean up base64 prefix if present
            const data = base64Data.includes('base64,') ? 
                base64Data.split('base64,')[1] : base64Data;

            const result = await Filesystem.writeFile({
                path: `${IMAGE_DIR}/${fileName}`,
                data: data,
                directory: Directory.Data
            });

            return result.uri;
        } catch (err) {
            console.error("ImageStore Save Error:", err);
            // If filesystem fails, fallback to base64 (localStorage) even if it might exceed quota
            return base64Data;
        }
    },

    /**
     * Deletes an image from the filesystem.
     * @param {string} uri The file URI to delete
     */
    async deleteImage(uri) {
        if (!uri || !Capacitor.isNativePlatform()) return;
        if (!uri.startsWith('file://')) return; // Not a filesystem reference

        try {
            await Filesystem.deleteFile({
                path: uri
            });
        } catch (err) {
            console.error("ImageStore Delete Error:", err);
        }
    },

    /**
     * Resolves a storage URI to a displayable URL.
     * @param {string} uri Storage URI or base64 string
     * @returns {string|null} URL safe for <img> tags
     */
    getUrl(uri) {
        if (!uri) return null;
        
        // If it's a native path, convert it for the WebView
        if (Capacitor.isNativePlatform() && uri.startsWith('file://')) {
            return Capacitor.convertFileSrc(uri);
        }
        
        return uri;
    }
};
