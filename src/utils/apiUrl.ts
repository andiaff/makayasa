/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_CONFIG_KEY = 'makayasa_owner_config';

/**
 * Returns the correct API endpoint URL.
 * If the application is running inside a Capacitor wrapper on mobile,
 * it prepends the configured server base URL (Vercel/Cloud Run).
 * Otherwise, it returns the relative path for browser execution.
 */
export function getApiUrl(path: string): string {
  const isCapacitor = 
    (window as any).Capacitor || 
    window.location.protocol === 'capacitor:' || 
    (window.location.origin === 'http://localhost' && !window.location.port);

  if (isCapacitor) {
    try {
      const savedConfig = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.serverBaseUrl) {
          const baseUrl = config.serverBaseUrl.trim().replace(/\/$/, '');
          const cleanPath = path.startsWith('/') ? path : '/' + path;
          return `${baseUrl}${cleanPath}`;
        }
      }
    } catch (e) {
      console.warn('[API URL] Gagal membaca serverBaseUrl dari localStorage:', e);
    }
  }
  
  return path;
}
