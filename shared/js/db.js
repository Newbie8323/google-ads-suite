/**
 * AdsIntelligenceDB - Lightweight IndexedDB Wrapper for Google Ads & Affiliate Suite
 * Provides persistent offline client-side storage for huge CSV datasets, sessions & negative keywords
 */
(function(global) {
  const DB_NAME = 'GoogleAdsSuiteDB';
  const DB_VERSION = 1;

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in global)) {
        console.warn('[AdsDB] IndexedDB is not supported in this environment.');
        return resolve(null);
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function(e) {
        const db = e.target.result;

        // 1. Sessions metadata store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionsStore.createIndex('module', 'module', { unique: false });
          sessionsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 2. Search Terms datasets
        if (!db.objectStoreNames.contains('search_terms_cache')) {
          db.createObjectStore('search_terms_cache', { keyPath: 'id' });
        }

        // 3. Shopee Product datasets
        if (!db.objectStoreNames.contains('shopee_reports_cache')) {
          db.createObjectStore('shopee_reports_cache', { keyPath: 'id' });
        }

        // 4. Persistent Negatives Library
        if (!db.objectStoreNames.contains('negative_library')) {
          db.createObjectStore('negative_library', { keyPath: 'key' });
        }
      };

      request.onsuccess = function(e) {
        resolve(e.target.result);
      };

      request.onerror = function(e) {
        console.error('[AdsDB] Failed to open IndexedDB:', e.target.error);
        resolve(null);
      };
    });

    return dbPromise;
  }

  const AdsDB = {
    /**
     * Save a session metadata and its associated heavy dataset
     */
    async saveSession(moduleName, name, summary, dataset) {
      const db = await openDB();
      if (!db) return null;

      const id = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const sessionMeta = {
        id,
        module: moduleName,
        name: name || ('Phiên ' + new Date().toLocaleString('vi-VN')),
        createdAt: new Date().toISOString(),
        summary: summary || {},
        rowCount: Array.isArray(dataset) ? dataset.length : 0
      };

      return new Promise((resolve, reject) => {
        const storeName = moduleName === 'search_terms' ? 'search_terms_cache' : 'shopee_reports_cache';
        const tx = db.transaction(['sessions', storeName], 'readwrite');
        
        tx.oncomplete = () => resolve(sessionMeta);
        tx.onerror = (e) => reject(e.target.error);

        tx.objectStore('sessions').put(sessionMeta);
        tx.objectStore(storeName).put({ id, data: dataset });
      });
    },

    /**
     * Get list of all sessions for a specific module
     */
    async listSessions(moduleName) {
      const db = await openDB();
      if (!db) return [];

      return new Promise((resolve, reject) => {
        const tx = db.transaction('sessions', 'readonly');
        const store = tx.objectStore('sessions');
        const index = store.index('module');
        const request = index.getAll(IDBKeyRange.only(moduleName));

        request.onsuccess = () => {
          const list = request.result || [];
          list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          resolve(list);
        };
        request.onerror = (e) => reject(e.target.error);
      });
    },

    /**
     * Load session dataset by session ID
     */
    async loadSession(moduleName, id) {
      const db = await openDB();
      if (!db) return null;

      const storeName = moduleName === 'search_terms' ? 'search_terms_cache' : 'shopee_reports_cache';
      return new Promise((resolve, reject) => {
        const tx = db.transaction([storeName, 'sessions'], 'readonly');
        const dataReq = tx.objectStore(storeName).get(id);
        const metaReq = tx.objectStore('sessions').get(id);

        let dataRes = null;
        let metaRes = null;

        dataReq.onsuccess = () => { dataRes = dataReq.result; };
        metaReq.onsuccess = () => { metaRes = metaReq.result; };

        tx.oncomplete = () => {
          if (!dataRes) resolve(null);
          else resolve({ meta: metaRes, data: dataRes.data });
        };
        tx.onerror = (e) => reject(e.target.error);
      });
    },

    /**
     * Delete session and its dataset
     */
    async deleteSession(moduleName, id) {
      const db = await openDB();
      if (!db) return false;

      const storeName = moduleName === 'search_terms' ? 'search_terms_cache' : 'shopee_reports_cache';
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['sessions', storeName], 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);

        tx.objectStore('sessions').delete(id);
        tx.objectStore(storeName).delete(id);
      });
    },

    /**
     * Save key-value in negative library
     */
    async setLibraryItem(key, value) {
      const db = await openDB();
      if (!db) return false;

      return new Promise((resolve, reject) => {
        const tx = db.transaction('negative_library', 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e.target.error);
        tx.objectStore('negative_library').put({ key, value });
      });
    },

    /**
     * Get key-value from negative library
     */
    async getLibraryItem(key) {
      const db = await openDB();
      if (!db) return null;

      return new Promise((resolve, reject) => {
        const tx = db.transaction('negative_library', 'readonly');
        const req = tx.objectStore('negative_library').get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = (e) => reject(e.target.error);
      });
    }
  };

  global.AdsDB = AdsDB;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdsDB;
  }
})(typeof window !== 'undefined' ? window : globalThis);

