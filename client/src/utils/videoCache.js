// videoCache.js - IndexedDB caching for transcoded videos

const DB_NAME = 'WatchTogetherCache';
const DB_VERSION = 1;
const STORE_NAME = 'transcodedVideos';
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB max cache

/**
 * Initialize IndexedDB
 */
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('filename', 'filename', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('size', 'size', { unique: false });
      }
    };
  });
};

/**
 * Generate cache key from file properties
 */
const generateCacheKey = (file) => {
  return `${file.name}_${file.size}_${file.lastModified}`;
};

/**
 * Get cached transcoded video
 */
export const getCachedVideo = async (originalFile) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const key = generateCacheKey(originalFile);
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          console.log('Found cached transcoded video:', key);
          resolve(result.blob);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached video:', error);
    return null;
  }
};

/**
 * Save transcoded video to cache
 */
export const cacheTranscodedVideo = async (originalFile, transcodedBlob) => {
  try {
    const db = await initDB();
    
    // Check cache size before saving
    const currentSize = await getTotalCacheSize();
    if (currentSize + transcodedBlob.size > MAX_CACHE_SIZE) {
      // Remove oldest entries to make space
      await cleanupOldEntries(transcodedBlob.size);
    }
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const cacheEntry = {
      id: generateCacheKey(originalFile),
      filename: originalFile.name,
      originalSize: originalFile.size,
      transcodedSize: transcodedBlob.size,
      blob: transcodedBlob,
      timestamp: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(cacheEntry);
      
      request.onsuccess = () => {
        console.log('Cached transcoded video:', cacheEntry.id);
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error caching video:', error);
    throw error;
  }
};

/**
 * Get total size of cached videos
 */
export const getTotalCacheSize = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const entries = request.result;
        const totalSize = entries.reduce((sum, entry) => sum + entry.transcodedSize, 0);
        resolve(totalSize);
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
};

/**
 * Clean up oldest cache entries to make space
 */
const cleanupOldEntries = async (requiredSpace) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor();
      let freedSpace = 0;
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && freedSpace < requiredSpace) {
          const entry = cursor.value;
          freedSpace += entry.transcodedSize;
          cursor.delete();
          cursor.continue();
        } else {
          console.log(`Freed ${freedSpace} bytes from cache`);
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
};

/**
 * Clear all cached videos
 */
export const clearCache = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('Cache cleared');
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const entries = request.result;
        const totalSize = entries.reduce((sum, entry) => sum + entry.transcodedSize, 0);
        
        resolve({
          count: entries.length,
          totalSize,
          maxSize: MAX_CACHE_SIZE,
          usagePercent: (totalSize / MAX_CACHE_SIZE) * 100
        });
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      count: 0,
      totalSize: 0,
      maxSize: MAX_CACHE_SIZE,
      usagePercent: 0
    };
  }
};

export default {
  getCachedVideo,
  cacheTranscodedVideo,
  getTotalCacheSize,
  clearCache,
  getCacheStats
};
