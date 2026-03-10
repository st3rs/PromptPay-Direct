import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { LogEntry } from '../types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if config is provided
const isFirebaseConfigured = !!firebaseConfig.projectId;
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;

export const SEC_LOGS_COLLECTION = 'sec_audit_logs';

export const FirebaseService = {
  logEvent: async (log: LogEntry, transactionId?: string) => {
    if (!db) {
      console.warn('Firebase not configured. Log not saved to Firestore:', log);
      return;
    }
    
    try {
      const logsRef = collection(db, SEC_LOGS_COLLECTION);
      await addDoc(logsRef, {
        ...log,
        transactionId: transactionId || null,
        serverTimestamp: Timestamp.now(), // SEC compliance: server-side timestamp
        // Additional SEC compliance fields could be added here (e.g., IP address, user agent)
      });
    } catch (error) {
      console.error('Error writing SEC log to Firestore:', error);
    }
  },

  getRecentLogs: async (maxLogs: number = 100): Promise<LogEntry[]> => {
    if (!db) return [];

    try {
      const logsRef = collection(db, SEC_LOGS_COLLECTION);
      const q = query(logsRef, orderBy('serverTimestamp', 'desc'), limit(maxLogs));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          timestamp: data.timestamp,
          level: data.level,
          module: data.module,
          message: data.message,
          hash: data.hash
        } as LogEntry;
      });
    } catch (error) {
      console.error('Error fetching SEC logs from Firestore:', error);
      return [];
    }
  }
};
