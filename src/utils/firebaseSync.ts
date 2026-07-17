import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

// Use environment variables if provided (useful for secure Vercel/GitHub deployments), 
// otherwise fall back to local JSON configuration.
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || defaultFirebaseConfig.measurementId || "",
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || defaultFirebaseConfig.firestoreDatabaseId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Synced keys mapping: localStorageKey -> firestoreCollection
const SYNC_KEYS: Record<string, string> = {
  'makayasa_expenses': 'expenses',
  'makayasa_sales_deposits': 'sales_deposits',
  'makayasa_freelance_records': 'freelance_records',
  'makayasa_stok_gudang': 'stok_gudang'
};

const CONFIG_KEY = 'makayasa_owner_config';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Log the error but do NOT throw to prevent background sync from crashing the main UI thread.
  // This allows the application to remain functional and fall back gracefully to local storage.
}

// Flag to prevent infinite loop (server update triggering upload)
let isSyncingFromServer = false;
// Flag to prevent client's initial local state writes from overwriting Firestore server truth during startup reconciliation
let isReconciliationDone = false;

// Active listeners to avoid duplicates
const activeListeners: Record<string, () => void> = {};

// Track active local writes/uploads to avoid snapshot races overwriting fresh local inputs
const activeWrites: Record<string, number> = {};

// Helper to check if two values are deeply equal, handling key order in objects
function isDataEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    // Sort array copies by ID if available to compare stable content, otherwise string value
    const getStableKey = (item: any) => {
      if (item && typeof item === 'object') {
        return item.id || JSON.stringify(item);
      }
      return String(item);
    };
    const sortedA = [...a].sort((x, y) => getStableKey(x).localeCompare(getStableKey(y)));
    const sortedB = [...b].sort((x, y) => getStableKey(x).localeCompare(getStableKey(y)));
    for (let i = 0; i < sortedA.length; i++) {
      if (!isDataEqual(sortedA[i], sortedB[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!isDataEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Sanitize item before uploading to Firestore to ensure absolute conformance with firestore.rules constraints
 */
function sanitizeUploadItem(collectionName: string, item: any): any {
  // Deep copy the item to avoid modifying original local storage state in-memory
  const cleaned = JSON.parse(JSON.stringify(item));

  // Ensure 'id' is a string with size <= 128
  if (!cleaned.id) {
    cleaned.id = `GEN-${Math.random().toString(36).substring(2, 12)}`;
  } else {
    cleaned.id = String(cleaned.id).substring(0, 128);
  }

  if (collectionName === 'stok_gudang') {
    // 1. Ensure required fields: id, tanggal, tipe, sumberTujuan, jumlah
    
    // tanggal: must be a string with size <= 128
    if (cleaned.tanggal) {
      if (typeof cleaned.tanggal === 'object') {
        try {
          cleaned.tanggal = new Date(cleaned.tanggal).toISOString().substring(0, 128);
        } catch {
          cleaned.tanggal = new Date().toISOString().substring(0, 128);
        }
      } else {
        cleaned.tanggal = String(cleaned.tanggal).substring(0, 128);
      }
    } else {
      cleaned.tanggal = new Date().toISOString().substring(0, 128);
    }

    // tipe: 'Masuk' | 'Keluar'
    if (cleaned.tipe !== 'Masuk' && cleaned.tipe !== 'Keluar') {
      cleaned.tipe = 'Keluar';
    }

    // sumberTujuan: string with size <= 128
    if (cleaned.sumberTujuan) {
      cleaned.sumberTujuan = String(cleaned.sumberTujuan).substring(0, 128);
    } else {
      cleaned.sumberTujuan = cleaned.tipe === 'Masuk' ? 'Pabrik Makayasa' : 'Sales Umum';
    }

    // jumlah: number with limit 1000000
    if (typeof cleaned.jumlah !== 'number' || isNaN(cleaned.jumlah) || cleaned.jumlah < 0) {
      cleaned.jumlah = Math.min(1000000, Math.max(0, parseInt(cleaned.jumlah as any, 10) || 0));
    } else {
      cleaned.jumlah = Math.min(1000000, cleaned.jumlah);
    }

    // 2. Ensure optional fields types
    // keterangan: string <= 5000
    if (cleaned.keterangan !== undefined && cleaned.keterangan !== null) {
      cleaned.keterangan = String(cleaned.keterangan).substring(0, 5000);
    } else {
      delete cleaned.keterangan;
    }

    // sumberInput: 'Aplikasi' | 'Spreadsheet'
    if (cleaned.sumberInput !== undefined && cleaned.sumberInput !== null) {
      if (cleaned.sumberInput !== 'Aplikasi' && cleaned.sumberInput !== 'Spreadsheet') {
        cleaned.sumberInput = 'Aplikasi';
      }
    } else {
      delete cleaned.sumberInput;
    }

    // hanyaSales: bool
    if (cleaned.hanyaSales !== undefined && cleaned.hanyaSales !== null) {
      cleaned.hanyaSales = Boolean(cleaned.hanyaSales);
    } else {
      delete cleaned.hanyaSales;
    }

    // salesName: string <= 128
    if (cleaned.salesName !== undefined && cleaned.salesName !== null) {
      cleaned.salesName = String(cleaned.salesName).substring(0, 128);
    } else {
      delete cleaned.salesName;
    }

    // isReversed: bool
    if (cleaned.isReversed !== undefined && cleaned.isReversed !== null) {
      cleaned.isReversed = Boolean(cleaned.isReversed);
    } else {
      delete cleaned.isReversed;
    }

    // reversedAt: string <= 128
    if (cleaned.reversedAt !== undefined && cleaned.reversedAt !== null) {
      cleaned.reversedAt = String(cleaned.reversedAt).substring(0, 128);
    } else {
      delete cleaned.reversedAt;
    }
  }

  else if (collectionName === 'expenses') {
    // Required: id, tanggal, kategori, nominal, keterangan
    if (cleaned.tanggal) {
      cleaned.tanggal = String(cleaned.tanggal).substring(0, 128);
    } else {
      cleaned.tanggal = new Date().toISOString().substring(0, 128);
    }

    const categories = ['Marketing', 'Transfer Pabrik', 'Operasional', 'Gaji & Komisi', 'Sewa & Logistik', 'Lainnya', 'Biaya Tester/Promosi'];
    if (!categories.includes(cleaned.kategori)) {
      cleaned.kategori = 'Lainnya';
    }

    if (typeof cleaned.nominal !== 'number' || isNaN(cleaned.nominal) || cleaned.nominal < 0) {
      cleaned.nominal = parseFloat(cleaned.nominal as any) || 0;
    }

    if (cleaned.keterangan !== undefined && cleaned.keterangan !== null) {
      cleaned.keterangan = String(cleaned.keterangan).substring(0, 10000);
    } else {
      cleaned.keterangan = 'Biaya pengeluaran operasional';
    }
  }

  else if (collectionName === 'sales_deposits') {
    // Required: id, tanggalSetor, salesName, tanggalMulaiPeriode, tanggalSelesaiPeriode, qtyPacksInPeriod, totalOmsetInPeriod, jumlahDisetor, selisihSetoran, statusSetoran
    cleaned.tanggalSetor = String(cleaned.tanggalSetor || new Date().toISOString()).substring(0, 128);
    cleaned.salesName = String(cleaned.salesName || 'Sales').substring(0, 128);
    cleaned.tanggalMulaiPeriode = String(cleaned.tanggalMulaiPeriode || new Date().toISOString()).substring(0, 128);
    cleaned.tanggalSelesaiPeriode = String(cleaned.tanggalSelesaiPeriode || new Date().toISOString()).substring(0, 128);

    if (typeof cleaned.qtyPacksInPeriod !== 'number' || isNaN(cleaned.qtyPacksInPeriod) || cleaned.qtyPacksInPeriod < 0) {
      cleaned.qtyPacksInPeriod = Math.min(1000000, Math.max(0, parseInt(cleaned.qtyPacksInPeriod as any, 10) || 0));
    } else {
      cleaned.qtyPacksInPeriod = Math.min(1000000, cleaned.qtyPacksInPeriod);
    }

    if (typeof cleaned.totalOmsetInPeriod !== 'number' || isNaN(cleaned.totalOmsetInPeriod)) {
      cleaned.totalOmsetInPeriod = parseFloat(cleaned.totalOmsetInPeriod as any) || 0;
    }

    if (typeof cleaned.jumlahDisetor !== 'number' || isNaN(cleaned.jumlahDisetor)) {
      cleaned.jumlahDisetor = parseFloat(cleaned.jumlahDisetor as any) || 0;
    }

    if (typeof cleaned.selisihSetoran !== 'number' || isNaN(cleaned.selisihSetoran)) {
      cleaned.selisihSetoran = parseFloat(cleaned.selisihSetoran as any) || 0;
    }

    if (cleaned.statusSetoran !== 'Lunas' && cleaned.statusSetoran !== 'Kurang Setor' && cleaned.statusSetoran !== 'Lebih Setor') {
      cleaned.statusSetoran = 'Lunas';
    }

    if (cleaned.keterangan !== undefined && cleaned.keterangan !== null) {
      cleaned.keterangan = String(cleaned.keterangan).substring(0, 10000);
    } else {
      delete cleaned.keterangan;
    }

    if (cleaned.archived !== undefined && cleaned.archived !== null) {
      cleaned.archived = Boolean(cleaned.archived);
    } else {
      delete cleaned.archived;
    }
  }

  else if (collectionName === 'freelance_records') {
    // Required: id, tanggalAmbil, namaFreelance, qtyPacks, pricePerPack, totalOmset, statusPembayaran, jumlahDibayar, kurangBayar
    cleaned.tanggalAmbil = String(cleaned.tanggalAmbil || new Date().toISOString()).substring(0, 128);
    cleaned.namaFreelance = String(cleaned.namaFreelance || 'Freelance').substring(0, 128);

    if (typeof cleaned.qtyPacks !== 'number' || isNaN(cleaned.qtyPacks) || cleaned.qtyPacks < 0) {
      cleaned.qtyPacks = Math.min(1000000, Math.max(0, parseInt(cleaned.qtyPacks as any, 10) || 0));
    } else {
      cleaned.qtyPacks = Math.min(1000000, cleaned.qtyPacks);
    }

    if (typeof cleaned.pricePerPack !== 'number' || isNaN(cleaned.pricePerPack) || cleaned.pricePerPack < 0) {
      cleaned.pricePerPack = Math.min(1000000, Math.max(0, parseFloat(cleaned.pricePerPack as any) || 0));
    } else {
      cleaned.pricePerPack = Math.min(1000000, cleaned.pricePerPack);
    }

    if (typeof cleaned.totalOmset !== 'number' || isNaN(cleaned.totalOmset)) {
      cleaned.totalOmset = parseFloat(cleaned.totalOmset as any) || 0;
    }

    if (cleaned.statusPembayaran !== 'Belum Bayar' && cleaned.statusPembayaran !== 'Cicil' && cleaned.statusPembayaran !== 'Lunas') {
      cleaned.statusPembayaran = 'Belum Bayar';
    }

    if (typeof cleaned.jumlahDibayar !== 'number' || isNaN(cleaned.jumlahDibayar)) {
      cleaned.jumlahDibayar = parseFloat(cleaned.jumlahDibayar as any) || 0;
    }

    if (typeof cleaned.kurangBayar !== 'number' || isNaN(cleaned.kurangBayar)) {
      cleaned.kurangBayar = parseFloat(cleaned.kurangBayar as any) || 0;
    }

    if (cleaned.potongStokGudang !== undefined && cleaned.potongStokGudang !== null) {
      cleaned.potongStokGudang = Boolean(cleaned.potongStokGudang);
    } else {
      delete cleaned.potongStokGudang;
    }

    if (cleaned.keterangan !== undefined && cleaned.keterangan !== null) {
      cleaned.keterangan = String(cleaned.keterangan).substring(0, 10000);
    } else {
      delete cleaned.keterangan;
    }

    if (cleaned.returPacks !== undefined && cleaned.returPacks !== null) {
      if (typeof cleaned.returPacks !== 'number' || isNaN(cleaned.returPacks) || cleaned.returPacks < 0) {
        cleaned.returPacks = parseFloat(cleaned.returPacks as any) || 0;
      }
    } else {
      delete cleaned.returPacks;
    }

    if (cleaned.tanggalLunas !== undefined && cleaned.tanggalLunas !== null) {
      cleaned.tanggalLunas = String(cleaned.tanggalLunas).substring(0, 128);
    } else {
      delete cleaned.tanggalLunas;
    }

    if (cleaned.archived !== undefined && cleaned.archived !== null) {
      cleaned.archived = Boolean(cleaned.archived);
    } else {
      delete cleaned.archived;
    }
  }

  return cleaned;
}

/**
 * Sync from client (localStorage) to Firestore server
 */
async function syncLocalToServer(key: string, rawValue: string | null) {
  if (isSyncingFromServer) return;

  activeWrites[key] = (activeWrites[key] || 0) + 1;

  try {
    if (key === CONFIG_KEY) {
      if (!rawValue) return;
      const parsedConfig = JSON.parse(rawValue);
      const completedConfig = {
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1ZS6Zk0vPlMER19uRdPLZHiXReZNnJsMwdaZhFZdCeus/edit',
        appScriptUrl: 'https://script.google.com/macros/s/AKfycbzRLas2Vn2Phi0EkEV3yva6351pSdUR-097R-e9Gb3n9-UfpZjwOaoszy6fyH0cWdDYvA/exec',
        pricePerPack: 6000,
        mode: 'live',
        brandName: 'MAKAYASA JEMBER',
        brandSubtitle: 'KOMANDAN',
        brandLogoInitials: 'MY',
        ownerName: 'Komandan Makayasa',
        ownerRole: 'Komandan Perusahaan',
        ownerInitials: 'KM',
        loginUsername: 'komandan',
        loginPassword: 'makayasajaya',
        isConfigured: true,
        ...parsedConfig
      };
      
      // Coerce pricePerPack to a valid integer number
      completedConfig.pricePerPack = parseInt(completedConfig.pricePerPack as any, 10) || 6000;
      
      try {
        await setDoc(doc(db, 'owner_config', 'global'), completedConfig);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'owner_config/global');
      }
      console.log('Firebase Sync: Config updated on server');
      return;
    }

    const collectionName = SYNC_KEYS[key];
    if (!collectionName) return;

    if (!rawValue) {
      // Key was removed, delete all docs in this collection
      let snapshot;
      try {
        snapshot = await getDocs(collection(db, collectionName));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, collectionName);
        return;
      }
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, collectionName);
      }
      console.log(`Firebase Sync: Cleared collection ${collectionName} on server`);
      return;
    }

    const localArray = JSON.parse(rawValue);
    if (!Array.isArray(localArray)) return;

    // Get current IDs on server to find deletions
    let serverSnapshot;
    try {
      serverSnapshot = await getDocs(collection(db, collectionName));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, collectionName);
      return;
    }
    const serverIds = serverSnapshot.docs.map(d => d.id);
    const localIds = localArray.map((item: any) => item.id).filter(Boolean);

    // Batch writes to be efficient
    const batch = writeBatch(db);
    let operationCount = 0;

    // 1. Write or update local items to server
    localArray.forEach((item: any) => {
      if (item && item.id) {
        let uploadItem = sanitizeUploadItem(collectionName, item);
        
        if (collectionName === 'expenses' && uploadItem.kategori === 'Biaya Tester/Promosi') {
          uploadItem = { ...uploadItem, kategori: 'Marketing' };
        }
        
        const docRef = doc(db, collectionName, uploadItem.id);
        batch.set(docRef, uploadItem);
        operationCount++;
      }
    });

    // 2. Delete items that no longer exist in local array
    serverIds.forEach(id => {
      if (!localIds.includes(id)) {
        const docRef = doc(db, collectionName, id);
        batch.delete(docRef);
        operationCount++;
      }
    });

    if (operationCount > 0) {
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, collectionName);
      }
      console.log(`Firebase Sync: Uploaded ${operationCount} changes for ${collectionName} to server`);
    }
  } catch (error) {
    console.error(`Firebase Sync: Error uploading ${key} to server`, error);
  } finally {
    activeWrites[key] = Math.max(0, (activeWrites[key] || 0) - 1);
  }
}

/**
 * Initialize listeners for each Firestore collection
 */
export function initializeFirebaseSync() {
  const isEnabled = localStorage.getItem('makayasa_cloud_sync_enabled') !== 'false';
  if (!isEnabled) {
    console.log('Firebase Sync: Cloud synchronization is currently disabled by user.');
    return;
  }

  console.log('Firebase Sync: Initializing real-time cross-device synchronization...');

  // Start initialization IIFE to perform safe pre-reconciliation before launching real-time listeners
  (async () => {
    try {
      console.log('Firebase Sync: Performing safe pre-reconciliation check...');
      (window as any).__makayasa_sync_active = true;
      
      // A. Reconcile Configuration
      const configSnap = await getDocs(collection(db, 'owner_config'));
      const localConfigRaw = localStorage.getItem(CONFIG_KEY);
      if (configSnap.empty) {
        if (localConfigRaw) {
          console.log('Firebase Sync Init: Uploading local config to empty server...');
          await syncLocalToServer(CONFIG_KEY, localConfigRaw);
        }
      } else {
        const serverConfig = configSnap.docs.map(doc => doc.data())[0];
        if (serverConfig) {
          const localConfig = localConfigRaw ? JSON.parse(localConfigRaw) : null;
          if (!isDataEqual(localConfig, serverConfig)) {
            console.log('Firebase Sync Init: Downloading config from server...');
            localStorage.setItem(CONFIG_KEY, JSON.stringify(serverConfig));
            window.dispatchEvent(new CustomEvent('makayasa_sync_update', { detail: { key: CONFIG_KEY } }));
          }
        }
      }

      // B. Reconcile Collections (Sales Deposits, Expenses, Freelance, Stock)
      for (const [localKey, collectionName] of Object.entries(SYNC_KEYS)) {
        let serverSnap;
        try {
          serverSnap = await getDocs(collection(db, collectionName));
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, collectionName);
          continue;
        }
        const localDataRaw = localStorage.getItem(localKey);
        let localArray = localDataRaw ? JSON.parse(localDataRaw) : [];

        if (localKey === 'makayasa_sales_deposits' && Array.isArray(localArray)) {
          localArray = localArray.filter((item: any) => !item.id || !String(item.id).startsWith('DEP-FREE-'));
        }

        if (serverSnap.empty) {
          // If server collection is empty but client has local records, upload them immediately
          if (Array.isArray(localArray) && localArray.length > 0) {
            console.log(`Firebase Sync Init: Seeding server collection "${collectionName}" with ${localArray.length} local records...`);
            await syncLocalToServer(localKey, JSON.stringify(localArray));
          }
        } else {
          // If server has records, we merge local and server records instead of a destructive overwrite.
          // This ensures that any records created on this client (e.g. sales deposits recorded offline or before syncing)
          // are safely merged and uploaded, rather than being wiped out!
          let serverArray = serverSnap.docs.map(doc => {
            const data = doc.data();
            if (collectionName === 'expenses' && data.kategori === 'Marketing' && data.keterangan?.includes('Biaya Tester/Promosi')) {
              data.kategori = 'Biaya Tester/Promosi';
            }
            return data;
          });

          if (collectionName === 'sales_deposits') {
            serverArray = serverArray.filter((item: any) => !item.id || !String(item.id).startsWith('DEP-FREE-'));
          }
          let mergedArray = [...localArray];
          let updated = false;

          serverArray.forEach((serverItem: any) => {
            const exists = mergedArray.some((localItem: any) => localItem.id === serverItem.id);
            if (!exists) {
              mergedArray.push(serverItem);
              updated = true;
            }
          });

          // Upload local-only items to server so other devices get them too
          const serverIds = serverArray.map((d: any) => d.id);
          const localOnlyItems = localArray.filter((l: any) => l.id && !serverIds.includes(l.id));
          if (localOnlyItems.length > 0) {
            console.log(`Firebase Sync Init: Seeding ${localOnlyItems.length} local-only items to server collection "${collectionName}"...`);
            await syncLocalToServer(localKey, JSON.stringify(mergedArray));
          }

          if (updated || !isDataEqual(localArray, mergedArray)) {
            console.log(`Firebase Sync Init: Merging server records into local storage for "${collectionName}"`);
            localStorage.setItem(localKey, JSON.stringify(mergedArray));
            window.dispatchEvent(new CustomEvent('makayasa_sync_update', { detail: { key: localKey } }));
          }
        }
      }
      
      console.log('Firebase Sync: Pre-reconciliation completed successfully. Setting up live snapshot listeners.');
    } catch (err) {
      console.error('Firebase Sync: Error during pre-reconciliation, proceeding with snapshot listeners...', err);
    } finally {
      isReconciliationDone = true;
      (window as any).__makayasa_sync_active = false;
    }

    // --- 1. SET UP REAL-TIME LISTENERS (SERVER -> CLIENT) ---
    
    // A. Listen to standard collection lists
    Object.entries(SYNC_KEYS).forEach(([localKey, collectionName]) => {
      // Unsubscribe if listener exists
      if (activeListeners[localKey]) {
        activeListeners[localKey]();
      }

      activeListeners[localKey] = onSnapshot(collection(db, collectionName), (snapshot) => {
        try {
          if (activeWrites[localKey] > 0) {
            console.log(`Firebase Sync: Ignoring server snapshot for ${collectionName} because a local write is in progress.`);
            return;
          }

          let serverData = snapshot.docs.map(doc => {
            const data = doc.data();
            if (collectionName === 'expenses' && data.kategori === 'Marketing' && data.keterangan?.includes('Biaya Tester/Promosi')) {
              data.kategori = 'Biaya Tester/Promosi';
            }
            return data;
          });

          if (collectionName === 'sales_deposits') {
            serverData = serverData.filter(item => !item.id || !String(item.id).startsWith('DEP-FREE-'));
          }

          const currentLocalRaw = localStorage.getItem(localKey);
          const currentLocal = currentLocalRaw ? JSON.parse(currentLocalRaw) : [];

          const finalArray = serverData;

          // Avoid rewrite if equal
          if (!isDataEqual(currentLocal, finalArray)) {
            const prevSyncActive = (window as any).__makayasa_sync_active;
            (window as any).__makayasa_sync_active = true;
            
            isSyncingFromServer = true;
            localStorage.setItem(localKey, JSON.stringify(finalArray));
            isSyncingFromServer = false;
            
            (window as any).__makayasa_sync_active = prevSyncActive;

            console.log(`Firebase Sync: Collection ${collectionName} updated from server. Syncing local state.`);
            // Trigger React component re-render
            window.dispatchEvent(new CustomEvent('makayasa_sync_update', { detail: { key: localKey } }));
          }
        } catch (err) {
          console.error(`Firebase Sync: Error in listener for ${collectionName}`, err);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, collectionName);
      });
    });

    // B. Listen to owner config
    if (activeListeners[CONFIG_KEY]) {
      activeListeners[CONFIG_KEY]();
    }
    activeListeners[CONFIG_KEY] = onSnapshot(doc(db, 'owner_config', 'global'), (docSnap) => {
      try {
        if (activeWrites[CONFIG_KEY] > 0) {
          console.log('Firebase Sync: Ignoring server config snapshot because local write is in progress.');
          return;
        }

        if (docSnap.exists()) {
          const serverConfig = docSnap.data();
          const localConfigRaw = localStorage.getItem(CONFIG_KEY);
          const localConfig = localConfigRaw ? JSON.parse(localConfigRaw) : null;

          if (!isDataEqual(localConfig, serverConfig)) {
            const prevSyncActive = (window as any).__makayasa_sync_active;
            (window as any).__makayasa_sync_active = true;
            
            isSyncingFromServer = true;
            localStorage.setItem(CONFIG_KEY, JSON.stringify(serverConfig));
            isSyncingFromServer = false;
            
            (window as any).__makayasa_sync_active = prevSyncActive;

            console.log('Firebase Sync: Config updated from server.');
            window.dispatchEvent(new CustomEvent('makayasa_sync_update', { detail: { key: CONFIG_KEY } }));
          }
        }
      } catch (err) {
        console.error('Firebase Sync: Error in config listener', err);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'owner_config/global');
    });
  })();
}

// --- 2. SET UP INTERCEPTORS (CLIENT -> SERVER) ---

// Override localStorage.setItem
const originalSetItem = localStorage.setItem;
localStorage.setItem = function (key: string, value: string) {
  originalSetItem.apply(this, [key, value]);
  
  const isEnabled = localStorage.getItem('makayasa_cloud_sync_enabled') !== 'false';
  const isSyncActive = (window as any).__makayasa_sync_active === true;
  if (isEnabled && isReconciliationDone && !isSyncActive && (SYNC_KEYS[key] || key === CONFIG_KEY)) {
    syncLocalToServer(key, value);
  }
};

// Override localStorage.removeItem
const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function (key: string) {
  originalRemoveItem.apply(this, [key]);
  
  const isEnabled = localStorage.getItem('makayasa_cloud_sync_enabled') !== 'false';
  const isSyncActive = (window as any).__makayasa_sync_active === true;
  if (isEnabled && isReconciliationDone && !isSyncActive && (SYNC_KEYS[key] || key === CONFIG_KEY)) {
    syncLocalToServer(key, null);
  }
};

/**
 * Stop all active firestore snapshot listeners
 */
export function disableFirebaseSync() {
  console.log('Firebase Sync: Disabling real-time synchronization...');
  Object.keys(activeListeners).forEach(key => {
    if (activeListeners[key]) {
      activeListeners[key]();
      delete activeListeners[key];
    }
  });
}

/**
 * Manually force a bidirectional synchronization
 */
function mergeArraysById(local: any[], server: any[]): any[] {
  const merged = [...local];
  server.forEach(serverItem => {
    const localIndex = merged.findIndex(localItem => localItem.id === serverItem.id);
    if (localIndex === -1) {
      merged.push(serverItem);
    } else {
      // If item exists in both, merge them together favoring local edits
      merged[localIndex] = { ...serverItem, ...merged[localIndex] };
    }
  });
  return merged;
}

export async function forceManualSync(): Promise<{ success: boolean; message: string }> {
  try {
    // Force write current local configurations and states to Firestore, or pull from Firestore if it exists
    for (const [localKey, collectionName] of Object.entries(SYNC_KEYS)) {
      const serverSnap = await getDocs(collection(db, collectionName));
      const localDataRaw = localStorage.getItem(localKey);
      const localArray = localDataRaw ? JSON.parse(localDataRaw) : [];
      const serverArray = serverSnap.docs.map(doc => {
        const data = doc.data();
        if (collectionName === 'expenses' && data.kategori === 'Marketing' && data.keterangan?.includes('Biaya Tester/Promosi')) {
          data.kategori = 'Biaya Tester/Promosi';
        }
        return data;
      });

      // Merge local and server data safely
      const mergedArray = mergeArraysById(localArray, serverArray);

      // Check if there are local-only items to upload
      const serverIds = serverArray.map((d: any) => d.id);
      const hasLocalOnly = localArray.some((l: any) => l.id && !serverIds.includes(l.id));

      if (hasLocalOnly) {
        console.log(`Firebase Sync Manual: Seeding ${collectionName} with local data`);
        await syncLocalToServer(localKey, JSON.stringify(mergedArray));
      }

      // Update local storage with the merged result if there are differences
      if (!isDataEqual(localArray, mergedArray)) {
        localStorage.setItem(localKey, JSON.stringify(mergedArray));
        window.dispatchEvent(new CustomEvent('makayasa_sync_update', { detail: { key: localKey } }));
      }
    }

    // Config Sync
    const configSnap = await getDocs(collection(db, 'owner_config'));
    const localConfigRaw = localStorage.getItem(CONFIG_KEY);
    if (configSnap.empty && localConfigRaw) {
      await syncLocalToServer(CONFIG_KEY, localConfigRaw);
    } else if (!configSnap.empty) {
      const serverConfig = configSnap.docs.map(doc => doc.data())[0];
      if (serverConfig) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(serverConfig));
        window.dispatchEvent(new CustomEvent('makayasa_sync_update', { detail: { key: CONFIG_KEY } }));
      }
    }

    return { success: true, message: 'Sinkronisasi Cloud berhasil diselesaikan!' };
  } catch (err: any) {
    console.error('Firebase Sync Manual: Failed', err);
    return { success: false, message: `Gagal sinkronisasi: ${err.message || err}` };
  }
}

/**
 * Retrieve current document counts on Firestore database
 */
export async function getCloudStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  try {
    for (const [_, collectionName] of Object.entries(SYNC_KEYS)) {
      const snap = await getDocs(collection(db, collectionName));
      stats[collectionName] = snap.size;
    }
    const configSnap = await getDocs(collection(db, 'owner_config'));
    stats['owner_config'] = configSnap.size;
  } catch (err) {
    console.error('Firebase Sync: Failed to fetch cloud stats', err);
  }
  return stats;
}

