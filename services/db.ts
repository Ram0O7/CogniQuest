
import { AppState, QuizHistoryItem } from '../types';

const DB_NAME = 'CogniQuestDB';
const DB_VERSION = 1;
const STORE_SESSION = 'current_session';
const STORE_HISTORY = 'quiz_history';

// Open Database Connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store for current active session (singleton state)
      if (!db.objectStoreNames.contains(STORE_SESSION)) {
        db.createObjectStore(STORE_SESSION);
      }

      // Store for quiz history
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        const historyStore = db.createObjectStore(STORE_HISTORY, { keyPath: 'id', autoIncrement: true });
        historyStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// --- Session Management ---

export const saveSession = async (state: AppState): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSION, 'readwrite');
    const store = tx.objectStore(STORE_SESSION);
    store.put(state, 'active_state');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to save session:", error);
  }
};

export const getSession = async (): Promise<AppState | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSION, 'readonly');
    const store = tx.objectStore(STORE_SESSION);
    const request = store.get('active_state');
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSION, 'readwrite');
    const store = tx.objectStore(STORE_SESSION);
    store.delete('active_state');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
};

// --- History Management ---

export const saveQuizHistory = async (item: Omit<QuizHistoryItem, 'id'>): Promise<number> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HISTORY, 'readwrite');
    const store = tx.objectStore(STORE_HISTORY);
    const request = store.add(item);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save history:", error);
    throw error;
  }
};

export const updateQuizHistory = async (id: number, item: Partial<QuizHistoryItem>): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HISTORY, 'readwrite');
    const store = tx.objectStore(STORE_HISTORY);
    
    // First get existing item to ensure we don't lose data and to verify ID exists
    const getRequest = store.get(id);
    
    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const existingItem = getRequest.result;
        if (existingItem) {
            const updatedItem = { ...existingItem, ...item, id }; // Ensure ID matches
            const putRequest = store.put(updatedItem);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        } else {
            reject(new Error("History item not found"));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error("Failed to update history:", error);
    throw error;
  }
};

export const getQuizHistory = async (): Promise<QuizHistoryItem[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HISTORY, 'readonly');
    const store = tx.objectStore(STORE_HISTORY);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Newest first

    const results: QuizHistoryItem[] = [];
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get history:", error);
    return [];
  }
};

export const deleteQuizHistory = async (id: number): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_HISTORY, 'readwrite');
    const store = tx.objectStore(STORE_HISTORY);
    store.delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("Failed to delete history item:", error);
  }
};
