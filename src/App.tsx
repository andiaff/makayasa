/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Terminal, HelpCircle, X, Bell, Volume2, VolumeX, Sparkles, Check, Info } from 'lucide-react';

// Import Types
import { Transaction, FilterOption, AppConfig } from './types';

// Import Utilities
import { 
  generateMockTransactions, 
  parseCSVToTransactions, 
  filterTransactions, 
  parseSpreadsheetUrl,
  formatDateIndo
} from './utils/spreadsheetParser';
import { fetchAllFromSpreadsheet, updateLocalStatesFromData } from './utils/spreadsheetSync';

// Import Modular Components
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import Dashboard from './components/Dashboard';
import PenjualanSales from './components/PenjualanSales';
import KunjunganSales from './components/KunjunganSales';
import DataToko from './components/DataToko';
import LeaderboardSales from './components/LeaderboardSales';
import TargetKomisi from './components/TargetKomisi';
import AppScriptIntegrator from './components/AppScriptIntegrator';
import LogTransaksi from './components/LogTransaksi';
import SistemPengaturan from './components/SistemPengaturan';
import OperasionalSales from './components/OperasionalSales';
import StokGudang from './components/StokGudang';
import StokSales from './components/StokSales';
import FreelanceManagement from './components/FreelanceManagement';
import SetoranSales from './components/SetoranSales';
import PembukuanKeuangan from './components/PembukuanKeuangan';
import WilayahArea from './components/WilayahArea';

// Local storage key constants
const STORAGE_CONFIG_KEY = 'makayasa_owner_config';
const STORAGE_SESSION_KEY = 'makayasa_owner_session';

export default function App() {
  // --- STATE DECLARATIONS ---
  const knownTransactionIdsRef = useRef<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [ownerName, setOwnerName] = useState<string>('');
  const [loggedInSalesName, setLoggedInSalesName] = useState<string | undefined>(undefined);
  const [activeMenu, setActiveMenu] = useState<number>(1); // Default to Dashboard Utama
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // App configurations state
  const [config, setConfig] = useState<AppConfig>(() => {
    const savedConfig = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        return {
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1ZS6Zk0vPlMER19uRdPLZHiXReZNnJsMwdaZhFZdCeus/edit',
          appScriptUrl: 'https://script.google.com/macros/s/AKfycbzRLas2Vn2Phi0EkEV3yva6351pSdUR-097R-e9Gb3n9-UfpZjwOaoszy6fyH0cWdDYvA/exec',
          pricePerPack: 6000,
          mode: 'live', // Default to live to avoid placeholder data
          brandName: 'MAKAYASA JEMBER',
          brandSubtitle: 'KOMANDAN',
          brandLogoInitials: 'MY',
          ownerName: 'Komandan Makayasa',
          ownerRole: 'Komandan Perusahaan',
          ownerInitials: 'KM',
          loginUsername: 'komandan',
          loginPassword: 'makayasajaya',
          ...parsed
        };
      } catch (e) {
        console.error('Gagal memuat konfigurasi dari local storage:', e);
      }
    }
    return {
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1ZS6Zk0vPlMER19uRdPLZHiXReZNnJsMwdaZhFZdCeus/edit',
      appScriptUrl: 'https://script.google.com/macros/s/AKfycbzRLas2Vn2Phi0EkEV3yva6351pSdUR-097R-e9Gb3n9-UfpZjwOaoszy6fyH0cWdDYvA/exec',
      pricePerPack: 6000,
      mode: 'live', // Default to live to avoid placeholder data
      brandName: 'MAKAYASA JEMBER',
      brandSubtitle: 'KOMANDAN',
      brandLogoInitials: 'MY',
      ownerName: 'Komandan Makayasa',
      ownerRole: 'Komandan Perusahaan',
      ownerInitials: 'KM',
      loginUsername: 'komandan',
      loginPassword: 'makayasajaya',
    };
  });

  // Filter configuration
  const [filter, setFilter] = useState<FilterOption>({
    type: 'range',
    startDate: '2026-06-15',
    endDate: '2026-06-28',
  });

  // Data states
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // AppScript testing states
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  // Error/Alert banner states
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // --- DARK/LIGHT THEME STATES ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  // Apply theme class to HTML/Body elements
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // --- REAL-TIME NOTIFICATION SIMULATOR STATES ---
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [autoSimulate, setAutoSimulate] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [toasts, setToasts] = useState<{
    id: string;
    title: string;
    body: string;
    timestamp: Date;
    tx?: Transaction;
  }[]>([]);

  // Play realistic synthesized double-tone notification sound via Web Audio API
  const playNotificationChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const now = ctx.currentTime;
      playTone(523.25, now, 0.35); // C5 chime
      playTone(659.25, now + 0.12, 0.45); // E5 chime
    } catch (error) {
      console.warn("AudioContext failed to start or is blocked by browser interaction policies:", error);
    }
  }, []);

  // Trigger HTML5 Browser Push Notification if permission is granted
  const triggerBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn("Browser ini tidak mendukung Notification API.");
      return;
    }
    
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'https://cdn-icons-png.flaticon.com/512/1157/1157000.png',
          tag: 'makayasa_notification'
        });
      } catch (err) {
        console.error("Gagal mengirim notifikasi browser:", err);
      }
    }
  }, []);

  // Request native browser notification permission
  const handleRequestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert("Browser Anda tidak mendukung API Notifikasi Browser.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        playNotificationChime();
        triggerBrowserNotification("Notifikasi Aktif!", "Terima kasih! Anda sekarang akan menerima peringatan transaksi masuk secara real-time.");
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
    }
  }, [playNotificationChime, triggerBrowserNotification]);

  // --- REAL-TIME TRANSACTION SIMULATION TRIGGER ---
  const handleSimulateNewTransaction = useCallback((customTx?: Partial<Transaction>) => {
    const salesNames = ['Rico', 'Anwari', 'Subai', 'Hafan', 'Jefri', 'Wicaksono', 'Kurniawan'];
    const storeNames = [
      'Toko Barokah Berjaya', 
      'Warung Madura Bu Ida', 
      'Kios Pojok Kebon Agung', 
      'Minimarket Sentosa Abadi', 
      'Toko Rejeki Agung Kudus', 
      'Kantin Makmur Sentosa', 
      'Toko Sumber Jaya Sembako'
    ];
    const storeAddresses = [
      'Jl. Pemuda No. 45, Semarang',
      'Jl. Merdeka No. 12, Sidoarjo',
      'Jl. Gajah Mada No. 89, Kudus',
      'Jl. Diponegoro No. 34, Pati',
      'Jl. Raya Darmo No. 101, Surabaya'
    ];
    const statuses: ('Baru Order' | 'Repeat Order')[] = ['Baru Order', 'Repeat Order'];

    const randomSales = salesNames[Math.floor(Math.random() * salesNames.length)];
    const randomStore = storeNames[Math.floor(Math.random() * storeNames.length)];
    const randomAddress = storeAddresses[Math.floor(Math.random() * storeAddresses.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const randomQty = Math.floor(Math.random() * 45) + 5; // 5 to 50 packs
    const randomOmset = randomQty * config.pricePerPack;

    const newTx: Transaction = {
      id: `TX-SIM-${Date.now()}`,
      tanggal: new Date(),
      salesName: customTx?.salesName || randomSales,
      storeName: customTx?.storeName || randomStore,
      storeAddress: customTx?.storeAddress || randomAddress,
      qtyPacks: customTx?.qtyPacks !== undefined ? customTx.qtyPacks : randomQty,
      omset: customTx?.omset !== undefined ? customTx.omset : randomOmset,
      statusKunjungan: customTx?.statusKunjungan || randomStatus,
      transaksiKe: customTx?.transaksiKe || (randomStatus === 'Repeat Order' ? '3 kali' : '0 (jika tidak pernah order)'),
      statusToko: customTx?.statusToko || (randomStore.toLowerCase().includes('konsumen') ? 'Konsumen / End User' : 'Toko / Outlet')
    };

    // Add to known IDs
    knownTransactionIdsRef.current.add(newTx.id);

    // Inject into rawTransactions
    setRawTransactions(prev => [newTx, ...prev]);

    // Format IDR helper
    const formattedAmt = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(newTx.omset);

    const title = `🚨 Transaksi Baru Masuk! (${newTx.salesName})`;
    const body = `${newTx.storeName} mengorder ${newTx.qtyPacks} Pack (${formattedAmt}) melalui Sales ${newTx.salesName}.`;

    // Play chime if sound is enabled
    if (soundEnabled) {
      playNotificationChime();
    }

    // Trigger browser notification
    triggerBrowserNotification(title, body);

    // Push beautiful in-app notification toast
    const newToast = {
      id: newTx.id,
      title,
      body,
      timestamp: new Date(),
      tx: newTx,
    };
    
    setToasts(prev => [newToast, ...prev]);

    // Dismiss toast after 7 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newTx.id));
    }, 7000);
  }, [config.pricePerPack, soundEnabled, playNotificationChime, triggerBrowserNotification]);

  // --- REAL-TIME AUTO SIMULATION TIMER ---
  useEffect(() => {
    if (!autoSimulate) return;

    // Trigger an initial alert after 3 seconds of enabling, then every 18 seconds
    const initialTimer = setTimeout(() => {
      handleSimulateNewTransaction();
    }, 3000);

    const interval = setInterval(() => {
      handleSimulateNewTransaction();
    }, 18000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [autoSimulate, handleSimulateNewTransaction]);

  // --- INITIALIZATION EFFECTS ---
  useEffect(() => {
    // Load config from LocalStorage if it exists
    const savedConfig = localStorage.getItem(STORAGE_CONFIG_KEY);
    let mergedConfig = { ...config };
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        mergedConfig = {
          ...config,
          ...parsed
        };
        setConfig(mergedConfig);
      } catch (e) {
        console.error('Gagal memuat konfigurasi dari local storage:', e);
      }
    }
    // Always write fully populated config object back to localStorage to ensure complete compatibility
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(mergedConfig));

    // Load active login session
    const savedSession = localStorage.getItem(STORAGE_SESSION_KEY);
    if (savedSession) {
      setIsLoggedIn(true);
      setOwnerName(savedSession);
      const savedSalesName = localStorage.getItem('makayasa_logged_in_sales_name');
      if (savedSalesName) {
        setLoggedInSalesName(savedSalesName);
      }
    }
  }, []);

  // Sync update listener for owner config
  useEffect(() => {
    const handleSyncUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.key === STORAGE_CONFIG_KEY) {
        const savedConfig = localStorage.getItem(STORAGE_CONFIG_KEY);
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            setConfig(prev => ({
              ...prev,
              ...parsed
            }));
          } catch (e) {
            console.error('Error parsing config during sync:', e);
          }
        }
      }
    };
    window.addEventListener('makayasa_sync_update', handleSyncUpdate);
    return () => {
      window.removeEventListener('makayasa_sync_update', handleSyncUpdate);
    };
  }, []);

  // Listen for Google Sheets background sync status events (failures) to show the user
  useEffect(() => {
    const handleSheetSyncStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { key, success, message } = customEvent.detail || {};
      
      if (!success) {
        const keyNames: Record<string, string> = {
          'makayasa_freelance_records': 'Manajemen Freelance',
          'makayasa_stok_gudang': 'Stok Gudang',
          'makayasa_sales_deposits': 'Setoran Sales',
          'makayasa_expenses': 'Keuangan'
        };
        const name = keyNames[key] || key;
        setBannerMessage(`Gagal menyinkronkan data ${name} ke Google Sheets: ${message}`);
      }
    };
    
    window.addEventListener('makayasa_sheet_sync_status', handleSheetSyncStatus);
    return () => {
      window.removeEventListener('makayasa_sheet_sync_status', handleSheetSyncStatus);
    };
  }, []);

  // Sync config changes to local storage
  const handleUpdateConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(newConfig));
    // Clear any previous error banner
    setBannerMessage(null);
  };

  // Reset config back to factory default
  const handleResetToDefault = () => {
    const defaultConfig: AppConfig = {
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
    };
    handleUpdateConfig(defaultConfig);
    setBannerMessage(null);
  };

  // --- REVOLUTIONARY SINKRONISASI ENGINE ---
  const syncSpreadsheetData = useCallback(async (forcedConfig?: AppConfig, isSilent: boolean = false, isManual: boolean = false) => {
    const activeConfig = forcedConfig || config;
    if (!isSilent) setLoading(true);
    setBannerMessage(null);

    // If Demo Mode is selected, generate high-fidelity simulated transactions
    if (activeConfig.mode === 'demo') {
      setTimeout(() => {
        const mockData = generateMockTransactions(activeConfig.pricePerPack);
        setRawTransactions(mockData);
        if (!isSilent) setLoading(false);
      }, 600);
      return;
    }

    // Live mode spreadsheet/appscript parsing
    try {
      const fetchWithTimeout = async (url: string, timeout = 60000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(id);
          return response;
        } catch (err) {
          clearTimeout(id);
          throw err;
        }
      };

      let parsedData: Transaction[] = [];
      let isAppScriptSync = false;

      // Prioritize live JSON API from Google Apps Script if configured
      if (activeConfig.appScriptUrl) {
        try {
          let targetUrl = activeConfig.appScriptUrl.trim();
          
          // Auto-fix: if the user forgot '/exec' at the end of the Google Apps Script URL, append it automatically
          if (targetUrl.includes("script.google.com/macros/s/")) {
            const parts = targetUrl.split("script.google.com/macros/s/");
            if (parts.length === 2) {
              const idSegment = parts[1];
              if (!idSegment.includes("/exec")) {
                const idClean = idSegment.split("?")[0].split("/")[0].trim();
                targetUrl = `https://script.google.com/macros/s/${idClean}/exec`;
              }
            }
          }

          let response;
          try {
            const proxyUrl = `/api/proxy-appscript?url=${encodeURIComponent(targetUrl)}`;
            response = await fetchWithTimeout(proxyUrl, 60000);
            if (!response.ok && response.status === 404) {
              // Fallback to direct browser fetch if the proxy endpoint returns 404 (e.g. on Vercel static)
              console.log("[SYNC] Proxy API returned 404 (running on Vercel or static host). Fetching Google Apps Script directly from browser...");
              response = await fetchWithTimeout(targetUrl, 60000);
            }
          } catch (proxyFetchErr) {
            console.log("[SYNC] Proxy fetch failed or timed out. Fetching Google Apps Script directly from browser...", proxyFetchErr);
            try {
              response = await fetchWithTimeout(targetUrl, 60000);
            } catch (directErr) {
              console.warn("[SYNC] Direct fetch also failed or timed out:", directErr);
            }
          }

          if (response && response.ok) {
            const json = await response.json();
            
            // Instantly sync secondary tabs using the exact same response!
            // Eliminates parallel redundant fetchAllFromSpreadsheet and 50% Apps Script CPU choke.
            if (json.status === 'success' && json.data) {
              updateLocalStatesFromData(json.data, isManual);
            }

            let transactionArray: any[] | null = null;
            if (json.status === 'success') {
              if (Array.isArray(json.data)) {
                transactionArray = json.data;
              } else if (json.data && typeof json.data === 'object') {
                if (Array.isArray(json.data['Data Sales'])) {
                  transactionArray = json.data['Data Sales'];
                } else if (Array.isArray(json.data['data sales'])) {
                  transactionArray = json.data['data sales'];
                } else if (Array.isArray(json.data.Transaksi)) {
                  transactionArray = json.data.Transaksi;
                } else if (Array.isArray(json.data.Sheet1)) {
                  transactionArray = json.data.Sheet1;
                } else {
                  const salesTabKey = Object.keys(json.data).find(k => {
                    const normalized = k.toLowerCase().trim().replace(/[\s_-]/g, '');
                    return normalized === 'datasales' || normalized === 'salesdata' || normalized === 'kunjungansales' || normalized === 'penjualansales';
                  });
                  if (salesTabKey && Array.isArray(json.data[salesTabKey])) {
                    transactionArray = json.data[salesTabKey];
                  } else {
                    const firstArrayKey = Object.keys(json.data).find(k => Array.isArray(json.data[k]));
                    if (firstArrayKey) {
                      transactionArray = json.data[firstArrayKey];
                    }
                  }
                }
              }
            }

            if (transactionArray) {
              isAppScriptSync = true;
              parsedData = transactionArray.map((row: any, i: number) => {
                // Parse quantity
                let qty = 0;
                const qtyKey = Object.keys(row).find(k => k.includes('penjualan') || k.includes('qty') || k.includes('jumlah') || k.includes('pack') || k.includes('pak') || k.includes('order'));
                if (qtyKey && row[qtyKey]) {
                  qty = parseInt(row[qtyKey].toString().replace(/[^0-9]/g, ''), 10) || 0;
                }

                // Parse status
                const keys = Object.keys(row);
                let statusKey = keys.find(k => k.toLowerCase().includes('hasil') || k.toLowerCase().includes('hasil kunjungan'));
                if (!statusKey) {
                  statusKey = keys.find(k => k.toLowerCase().includes('kunjungan') && !k.toLowerCase().includes('status toko'));
                }
                if (!statusKey) {
                  statusKey = keys.find(k => k.toLowerCase().includes('status') || k.toLowerCase().includes('tipe') || k.toLowerCase().includes('keterangan'));
                }
                let statusRaw = statusKey && row[statusKey] ? row[statusKey].toString().toLowerCase() : 'order';
                let statusKunjungan: 'Baru Order' | 'Tidak Order' | 'Repeat Order' = 'Baru Order';

                if (statusRaw.includes('tidak') || statusRaw.includes('no') || statusRaw.includes('revisi') || statusRaw.includes('batal') || statusRaw.includes('cancel') || statusRaw.includes('retur') || statusRaw.includes('dibatalkan') || qty === 0) {
                  statusKunjungan = 'Tidak Order';
                } else if (statusRaw.includes('repeat') || statusRaw.includes('langganan') || statusRaw.includes('ro')) {
                  statusKunjungan = 'Repeat Order';
                }

                const salesKey = Object.keys(row).find(k => k.includes('sales') || k.includes('nama sales') || k.includes('salesman')) || '';
                const storeKey = Object.keys(row).find(k => k.includes('toko') || k.includes('nama toko') || k.includes('outlet') || k.includes('store')) || '';
                const addressKey = Object.keys(row).find(k => k.includes('alamat') || k.includes('wilayah') || k.includes('address') || k.includes('lokasi')) || '';
                const dateKey = Object.keys(row).find(k => k.includes('tanggal') || k.includes('timestamp') || k.includes('date') || k.includes('waktu')) || '';
                const kecamatanKey = Object.keys(row).find(k => k.includes('kecamatan') || k.toLowerCase() === 'kec') || '';
                const desaKey = Object.keys(row).find(k => k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan') || k.toLowerCase() === 'kel') || '';
                const transaksiKeKey = Object.keys(row).find(k => k.toLowerCase().includes('transaksi ke') || k.toLowerCase().includes('berapa')) || '';
                
                const dateVal = row[dateKey] ? new Date(row[dateKey]) : new Date();
                const salesName = row[salesKey] || 'Sales Tak Dikenal';
                const storeName = row[storeKey] || 'Toko Umum';
                const storeAddress = row[addressKey] || 'Alamat Toko';
                const kecamatan = kecamatanKey && row[kecamatanKey] ? row[kecamatanKey].toString().trim() : undefined;
                const desa = desaKey && row[desaKey] ? row[desaKey].toString().trim() : undefined;
                const transaksiKe = transaksiKeKey && row[transaksiKeKey] ? row[transaksiKeKey].toString().trim() : undefined;

                // Stable unique content ID to prevent list collisions and key shifting
                const timeToken = dateVal ? dateVal.getTime() : i;
                const cleanSales = salesName.replace(/[^a-zA-Z0-9]/g, '');
                const cleanStore = storeName.replace(/[^a-zA-Z0-9]/g, '');
                const stableId = `TX-AS-${cleanSales}-${cleanStore}-${timeToken}`;

                return {
                  id: stableId,
                  tanggal: dateVal,
                  salesName,
                  storeName,
                  storeAddress,
                  qtyPacks: statusKunjungan === 'Tidak Order' ? 0 : qty,
                  omset: (statusKunjungan === 'Tidak Order' ? 0 : qty) * activeConfig.pricePerPack,
                  statusKunjungan,
                  kecamatan,
                  desa,
                  transaksiKe,
                  statusToko: (() => {
                    const statusTokoKey = Object.keys(row).find(k => {
                      const lowerK = k.toLowerCase();
                      return lowerK.includes('status toko') || 
                             lowerK.includes('status_toko') || 
                             lowerK.includes('tipe toko') ||
                             lowerK.includes('kategori toko') ||
                             lowerK.includes('tipe_toko') ||
                             lowerK.includes('klasifikasi');
                    });
                    if (statusTokoKey && row[statusTokoKey]) {
                      const stVal = row[statusTokoKey].toString().trim().toLowerCase();
                      if (stVal.includes('konsumen') || stVal.includes('end user') || stVal.includes('user') || stVal.includes('pribadi') || stVal.includes('ecer')) {
                        return 'Konsumen / End User';
                      }
                    }
                    
                    // Fallback to check if any property value in this row equals 'konsumen' or 'end user'
                    for (const key of Object.keys(row)) {
                      if (row[key]) {
                        const valStr = row[key].toString().trim().toLowerCase();
                        if (valStr === 'konsumen' || valStr === 'end user' || valStr === 'pribadi' || valStr === 'konsumen / end user') {
                          return 'Konsumen / End User';
                        }
                      }
                    }

                    const stName = (row[storeKey] || 'Toko Umum').toString().toLowerCase();
                    if (stName.includes('konsumen') || stName.includes('end user') || stName.includes('user') || stName.includes('pribadi')) {
                      return 'Konsumen / End User';
                    }
                    return 'Toko / Outlet';
                  })()
                };
              });
              // Sort by date descending
              parsedData.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());
            }
          }
        } catch (e) {
          console.warn('Apps Script sync failed, falling back to public CSV sync:', e);
        }
      }

      // Fallback to standard public sheet CSV parse if Apps Script is not configured or fails
      if (!isAppScriptSync) {
        const { sheetId, gid } = parseSpreadsheetUrl(activeConfig.spreadsheetUrl);
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
        
        let response;
        try {
          const proxyUrl = `/api/proxy-appscript?url=${encodeURIComponent(csvUrl)}`;
          response = await fetchWithTimeout(proxyUrl, 60000);
          if (!response.ok && response.status === 404) {
            console.log("[SYNC] Proxy API returned 404 for CSV. Fetching spreadsheet CSV directly...");
            response = await fetchWithTimeout(csvUrl, 60000);
          }
        } catch (csvFetchErr) {
          console.log("[SYNC] Proxy fetch for CSV failed or timed out. Fetching directly...", csvFetchErr);
          try {
            response = await fetchWithTimeout(csvUrl, 60000);
          } catch (directCsvErr) {
            console.warn("[SYNC] Direct CSV fetch also failed or timed out:", directCsvErr);
          }
        }

        if (!response || !response.ok) {
          throw new Error('Gagal mengunduh file spreadsheet. Pastikan dokumen diatur ke "Siapa saja dengan link dapat melihat".');
        }

        const csvText = await response.text();
        parsedData = parseCSVToTransactions(csvText, activeConfig.pricePerPack);
      }

      if (parsedData.length === 0 && activeConfig.mode === 'demo') {
        throw new Error('Spreadsheet kosong atau penamaan header kolom tidak cocok. Memakai data simulasi sebagai cadangan.');
      }

      // If NOT silent, clear known IDs so we don't trigger back-alerts for old rows on hard reload/sync config
      if (!isSilent) {
        knownTransactionIdsRef.current.clear();
      }

      // Background transaction notifications are disabled per user request to avoid disruption

      // Always populate/update the known transaction IDs ref so we track loaded rows correctly
      parsedData.forEach(t => knownTransactionIdsRef.current.add(t.id));

      // Quietly update state
      setRawTransactions(parsedData);
      if (!isSilent) setLoading(false);
    } catch (error: any) {
      console.warn('Kesalahan Sinkronisasi:', error);
      if (activeConfig.mode === 'demo' && rawTransactions.length === 0) {
        // Fallback seamlessly to mock data so the app remains perfectly functional
        const fallbackData = generateMockTransactions(activeConfig.pricePerPack);
        setRawTransactions(fallbackData);
      } else if (activeConfig.mode === 'live') {
        // Keep transactions empty as requested by the user, do not fallback to mock data
        setRawTransactions([]);
        setBannerMessage(
          `Gagal sinkronisasi data real-time: ${error.message || 'Koneksi terputus'}. Menampilkan data kosong.`
        );
      }
      if (!isSilent) setLoading(false);
    }
  }, [config, soundEnabled, playNotificationChime, triggerBrowserNotification, rawTransactions.length]);

  // Sync on mount or when mode/pricing/spreadsheetUrl/appScriptUrl changes
  useEffect(() => {
    syncSpreadsheetData();
  }, [syncSpreadsheetData]);

  // Periodic background auto-polling for real-time spreadsheet updates
  useEffect(() => {
    if (!isLoggedIn || config.mode !== 'live') return;

    // Background auto-polling interval of 30 seconds ensures fresh data without throttling Google APIs
    const interval = setInterval(() => {
      syncSpreadsheetData(undefined, true);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [isLoggedIn, config.mode, syncSpreadsheetData]);

  // Apply date range filters dynamically when rawTransactions or filters update
  useEffect(() => {
    let filtered = filterTransactions(rawTransactions, filter.type, filter.startDate, filter.endDate);
    if (loggedInSalesName) {
      filtered = filtered.filter(tx => tx.salesName && tx.salesName.toLowerCase().trim() === loggedInSalesName.toLowerCase().trim());
    }
    setFilteredTransactions(filtered);
  }, [rawTransactions, filter, loggedInSalesName]);

  // --- MANUAL WEB-APP / APPSCRIPT CONNECTOR TESTER ---
  const handleTestAppScriptUrl = async (url: string) => {
    if (!url) return;
    setTestStatus('testing');
    setTestMessage('Mencoba menyambungkan ke Google Apps Script Web App...');

    let cleanedUrl = url.trim();
    let isTruncated = false;
    let extractedId = '';
    
    // Auto-fix: if the user forgot '/exec' at the end of the Google Apps Script URL, append it automatically
    if (cleanedUrl.includes("script.google.com/macros/s/")) {
      const parts = cleanedUrl.split("script.google.com/macros/s/");
      if (parts.length === 2) {
        const idSegment = parts[1];
        extractedId = idSegment.split("?")[0].split("/")[0].trim();
        
        // Validate length of Google Apps Script Deployment ID
        if (extractedId.length < 50) {
          isTruncated = true;
        }

        if (!idSegment.includes("/exec")) {
          cleanedUrl = `https://script.google.com/macros/s/${extractedId}/exec`;
        }
      }
    }

    if (isTruncated) {
      setTestStatus('error');
      setTestMessage(`Koneksi Gagal: ID Web App Anda (${extractedId}) terlalu pendek (${extractedId.length} karakter). ID deployment asli dari Google Apps Script Web App yang valid biasanya terdiri dari 70-80 karakter (contoh diawali: "AKfycb..."). Silakan cek kembali dan salin URL lengkap dari menu Terapkan > Penerapan baru.`);
      return;
    }

    try {
      const testFetchWithTimeout = async (url: string, timeout = 60000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(id);
          return response;
        } catch (err) {
          clearTimeout(id);
          throw err;
        }
      };

      let res;
      try {
        const proxyUrl = `/api/proxy-appscript?url=${encodeURIComponent(cleanedUrl)}`;
        res = await testFetchWithTimeout(proxyUrl, 60000);
        if (!res.ok && res.status === 404) {
          console.log("[TEST] Proxy API returned 404 (running on Vercel). Fetching Apps Script directly from browser...");
          res = await testFetchWithTimeout(cleanedUrl, 60000);
        }
      } catch (proxyErr) {
        console.log("[TEST] Proxy fetch failed or timed out. Fetching Apps Script directly from browser...", proxyErr);
        try {
          res = await testFetchWithTimeout(cleanedUrl, 60000);
        } catch (directErr) {
          console.warn("[TEST] Direct connection test fetch failed or timed out:", directErr);
        }
      }

      if (!res) {
        throw new Error("Gagal melakukan permintaan koneksi.");
      }

      if (!res.ok) {
        let errMsg = `HTTP Error: ${res.status}`;
        try {
          const errData = await res.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch (_) {}

        if (res.status === 404) {
          errMsg = `HTTP Error 404: Tautan tidak ditemukan. Pastikan Anda telah menyalin seluruh URL Web App dari menu Terapkan (Deploy) > Penerapan baru (New deployment), bukan dari URL bilah alamat browser atau Editor Apps Script!`;
        } else if (res.status === 401 || res.status === 403) {
          errMsg = `HTTP Error ${res.status}: Akses Ditolak. Pastikan pengaturan Web App Anda adalah "Who has access: Anyone" (Siapa saja) dan "Execute as: Me" (Saya), lalu deploy ulang!`;
        }
        throw new Error(errMsg);
      }
      
      let json;
      try {
        json = await res.json();
      } catch (jsonErr) {
        throw new Error("Web App mengembalikan data non-JSON (HTML/Format Tidak Valid). Pastikan Anda telah men-deploy ulang Apps Script sebagai Web App baru, dan akses diatur ke 'Anyone' (Siapa saja) serta 'Execute as: Me'.");
      }
      
      let transactionArray: any[] | null = null;
      if (json.status === 'success') {
        if (Array.isArray(json.data)) {
          transactionArray = json.data;
        } else if (json.data && typeof json.data === 'object') {
          if (Array.isArray(json.data.Transaksi)) {
            transactionArray = json.data.Transaksi;
          } else if (Array.isArray(json.data.Sheet1)) {
            transactionArray = json.data.Sheet1;
          } else {
            const firstArrayKey = Object.keys(json.data).find(k => Array.isArray(json.data[k]));
            if (firstArrayKey) {
              transactionArray = json.data[firstArrayKey];
            }
          }
        }
      }
      
      if (transactionArray) {
        setTestStatus('success');
        setTestMessage(`Koneksi Sukses! Terbaca ${transactionArray.length} baris data dari Google Sheets secara real-time.`);
        
        // Save the cleaned appscript URL in our configurations
        const updated = {
          ...config,
          appScriptUrl: cleanedUrl,
          mode: 'live' as const
        };
        handleUpdateConfig(updated);
        
        // Force the input element in UI to also display the corrected working URL
        const inputEl = document.getElementById('appscript_url_input') as HTMLInputElement | null;
        if (inputEl) {
          inputEl.value = cleanedUrl;
        }
        
        // Override state with Apps Script JSON response
        const formattedData = transactionArray.map((row: any, i: number) => {
          // Parse quantity
          let qty = 0;
          const qtyKey = Object.keys(row).find(k => k.includes('penjualan') || k.includes('qty') || k.includes('jumlah') || k.includes('pack') || k.includes('pak') || k.includes('order'));
          if (qtyKey && row[qtyKey]) {
            qty = parseInt(row[qtyKey].toString().replace(/[^0-9]/g, ''), 10) || 0;
          }

          // Parse status
          const keys = Object.keys(row);
          let statusKey = keys.find(k => k.toLowerCase().includes('hasil') || k.toLowerCase().includes('hasil kunjungan'));
          if (!statusKey) {
            statusKey = keys.find(k => k.toLowerCase().includes('kunjungan') && !k.toLowerCase().includes('status toko'));
          }
          if (!statusKey) {
            statusKey = keys.find(k => k.toLowerCase().includes('status') || k.toLowerCase().includes('tipe') || k.toLowerCase().includes('keterangan'));
          }
          let statusRaw = statusKey && row[statusKey] ? row[statusKey].toString().toLowerCase() : 'order';
          let statusKunjungan: 'Baru Order' | 'Tidak Order' | 'Repeat Order' = 'Baru Order';

          if (statusRaw.includes('tidak') || statusRaw.includes('no') || statusRaw.includes('revisi') || statusRaw.includes('batal') || statusRaw.includes('cancel') || statusRaw.includes('retur') || statusRaw.includes('dibatalkan') || qty === 0) {
            statusKunjungan = 'Tidak Order';
          } else if (statusRaw.includes('repeat') || statusRaw.includes('langganan') || statusRaw.includes('ro')) {
            statusKunjungan = 'Repeat Order';
          }

          const salesKey = Object.keys(row).find(k => k.includes('sales') || k.includes('nama sales') || k.includes('salesman')) || '';
          const storeKey = Object.keys(row).find(k => k.includes('toko') || k.includes('nama toko') || k.includes('outlet') || k.includes('store')) || '';
          const addressKey = Object.keys(row).find(k => k.includes('alamat') || k.includes('wilayah') || k.includes('address') || k.includes('lokasi')) || '';
          const dateKey = Object.keys(row).find(k => k.includes('tanggal') || k.includes('timestamp') || k.includes('date') || k.includes('waktu')) || '';
          const kecamatanKey = Object.keys(row).find(k => k.includes('kecamatan') || k.toLowerCase() === 'kec') || '';
          const desaKey = Object.keys(row).find(k => k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan') || k.toLowerCase() === 'kel') || '';
          const transaksiKeKey = Object.keys(row).find(k => k.toLowerCase().includes('transaksi ke') || k.toLowerCase().includes('berapa')) || '';

          return {
            id: `TX-APPSCRIPT-${100 + i}`,
            tanggal: row[dateKey] ? new Date(row[dateKey]) : new Date(),
            salesName: row[salesKey] || 'Sales Tak Dikenal',
            storeName: row[storeKey] || 'Toko Umum',
            storeAddress: row[addressKey] || 'Alamat Toko',
            qtyPacks: statusKunjungan === 'Tidak Order' ? 0 : qty,
            omset: (statusKunjungan === 'Tidak Order' ? 0 : qty) * config.pricePerPack,
            statusKunjungan,
            kecamatan: kecamatanKey && row[kecamatanKey] ? row[kecamatanKey].toString().trim() : undefined,
            desa: desaKey && row[desaKey] ? row[desaKey].toString().trim() : undefined,
            transaksiKe: transaksiKeKey && row[transaksiKeKey] ? row[transaksiKeKey].toString().trim() : undefined,
            statusToko: (() => {
              const statusTokoKey = Object.keys(row).find(k => {
                const lowerK = k.toLowerCase();
                return lowerK.includes('status toko') || 
                       lowerK.includes('status_toko') || 
                       lowerK.includes('tipe toko') ||
                       lowerK.includes('kategori toko') ||
                       lowerK.includes('tipe_toko') ||
                       lowerK.includes('klasifikasi');
              });
              if (statusTokoKey && row[statusTokoKey]) {
                const stVal = row[statusTokoKey].toString().trim().toLowerCase();
                if (stVal.includes('konsumen') || stVal.includes('end user') || stVal.includes('user') || stVal.includes('pribadi') || stVal.includes('ecer')) {
                  return 'Konsumen / End User';
                }
              }

              // Fallback to check if any property value in this row equals 'konsumen' or 'end user'
              for (const key of Object.keys(row)) {
                if (row[key]) {
                  const valStr = row[key].toString().trim().toLowerCase();
                  if (valStr === 'konsumen' || valStr === 'end user' || valStr === 'pribadi' || valStr === 'konsumen / end user') {
                    return 'Konsumen / End User';
                  }
                }
              }

              const stName = (row[storeKey] || 'Toko Umum').toString().toLowerCase();
              if (stName.includes('konsumen') || stName.includes('end user') || stName.includes('user') || stName.includes('pribadi')) {
                return 'Konsumen / End User';
              }
              return 'Toko / Outlet';
            })()
          };
        });

        setRawTransactions(prev => {
          return formattedData.sort((a: any, b: any) => b.tanggal.getTime() - a.tanggal.getTime());
        });
      } else {
        throw new Error('Struktur JSON tidak cocok. Pastikan Apps Script mengembalikan array {status, data}.');
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMessage(`Koneksi Gagal: ${e.message || 'CORS Restriction / Invalid URL'}.`);
    }
  };

  // --- LOGIN WORKFLOWS ---
  const handleLoginSuccess = (user: string, salesName?: string) => {
    setIsLoggedIn(true);
    setOwnerName(user);
    localStorage.setItem(STORAGE_SESSION_KEY, user);
    if (salesName) {
      setLoggedInSalesName(salesName);
      localStorage.setItem('makayasa_logged_in_sales_name', salesName);
    } else {
      setLoggedInSalesName(undefined);
      localStorage.removeItem('makayasa_logged_in_sales_name');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setOwnerName('');
    setLoggedInSalesName(undefined);
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem('makayasa_logged_in_sales_name');
    // Return to dashboard menu on sign out
    setActiveMenu(1);
  };

  // Render dynamic main view panels corresponding to the 9 Sidebar items
  const renderActiveMenu = () => {
    // Dynamic extraction of unique salesnames across ALL loaded transactions
    const uniqueSalesNames: string[] = Array.from(
      new Set(
        rawTransactions
          .map(tx => tx.salesName)
          .filter((name): name is string => !!name && name !== 'Sales Tak Dikenal')
      )
    );
    const baseSalesNames = uniqueSalesNames.length > 0 
      ? uniqueSalesNames 
      : ['Rico', 'Anwari', 'Subai', 'Hafan', 'Jefri'];

    const finalSalesNames = loggedInSalesName 
      ? [loggedInSalesName] 
      : baseSalesNames;

    switch (activeMenu) {
      case 1:
        return <Dashboard transactions={filteredTransactions} onNavigateToMenu={(id) => setActiveMenu(id)} />;
      case 2:
        return <PenjualanSales transactions={filteredTransactions} salesNames={finalSalesNames} />;
      case 3:
        return <KunjunganSales transactions={filteredTransactions} salesNames={finalSalesNames} filter={filter} />;
      case 4: {
        const storeTransactions = loggedInSalesName
          ? rawTransactions.filter(tx => tx.salesName && tx.salesName.toLowerCase().trim() === loggedInSalesName.toLowerCase().trim())
          : rawTransactions;
        return <DataToko transactions={storeTransactions} />;
      }
      case 16:
        return <WilayahArea transactions={rawTransactions} />;
      case 5:
        return <LeaderboardSales transactions={filteredTransactions} salesNames={finalSalesNames} />;
      case 6:
        return <TargetKomisi transactions={filteredTransactions} salesNames={finalSalesNames} />;
      case 10:
        return <OperasionalSales transactions={filteredTransactions} salesNames={finalSalesNames} />;
      case 14: {
        const setoranTransactions = loggedInSalesName
          ? rawTransactions.filter(tx => tx.salesName && tx.salesName.toLowerCase().trim() === loggedInSalesName.toLowerCase().trim())
          : rawTransactions;
        return <SetoranSales transactions={setoranTransactions} salesNames={finalSalesNames} loggedInSalesName={loggedInSalesName} />;
      }
      case 15:
        return <PembukuanKeuangan />;
      case 11:
        return <StokGudang transactions={filteredTransactions} salesNames={finalSalesNames} />;
      case 12:
        return <StokSales transactions={filteredTransactions} salesNames={finalSalesNames} loggedInSalesName={loggedInSalesName} />;
      case 13:
        return <FreelanceManagement pricePerPack={config.pricePerPack} />;
      case 7:
        return (
          <AppScriptIntegrator 
            appScriptUrl={config.appScriptUrl}
            setAppScriptUrl={(url) => setConfig({ ...config, appScriptUrl: url })}
            onTestSync={handleTestAppScriptUrl}
            testStatus={testStatus}
            testMessage={testMessage}
            onSimulateIncomingTransaction={handleSimulateNewTransaction}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            autoSimulate={autoSimulate}
            setAutoSimulate={setAutoSimulate}
            notificationPermission={notificationPermission}
            onRequestPermission={handleRequestNotificationPermission}
          />
        );
      case 8:
        return <LogTransaksi transactions={filteredTransactions} />;
      case 9:
        return (
          <SistemPengaturan 
            config={config} 
            setConfig={handleUpdateConfig}
            onResetToDefault={handleResetToDefault}
          />
        );
      default:
        return <Dashboard transactions={filteredTransactions} onNavigateToMenu={(id) => setActiveMenu(id)} />;
    }
  };

  const getMenuTitle = () => {
    const titles: Record<number, string> = {
      1: 'Dashboard Utama Komandan',
      2: 'Penjualan & Omset Sales',
      3: 'Data Kunjungan Lapangan',
      4: 'Database Toko & Loyalitas',
      16: 'Evaluasi Penetrasi Wilayah & Area Jember',
      5: 'Leaderboard & Kompetisi Sales',
      6: 'Simulasi Target & Komisi Sales',
      7: 'Google Apps Script Integrator',
      8: 'Arsip & Log Transaksi Lengkap',
      9: 'Sistem Pengaturan Command Center',
      10: 'Evaluasi & Pengawasan Operasional Sales',
      14: 'Manajemen & Pengawasan Setoran Sales',
      15: 'Pembukuan Kas & Arus Keuangan Perusahaan',
      11: 'Manajemen Stok & Logistik Gudang',
      12: 'Manajemen Stok & Logistik Sales',
      13: 'Manajemen & Pengawasan Mitra Freelance'
    };
    return titles[activeMenu] || 'Command Center';
  };

  // Guard page for unauthenticated viewers
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} config={config} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-800 dark:text-slate-100 theme-transition">
      
      {/* 9-Menu Sidebar Navigation Panel */}
      <Sidebar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu} 
        ownerName={ownerName}
        onLogout={handleLogout}
        mode={config.mode}
        isOpenMobile={sidebarOpen}
        setIsOpenMobile={setSidebarOpen}
        isCollapsedTablet={sidebarCollapsed}
        setIsCollapsedTablet={setSidebarCollapsed}
        config={config}
        loggedInSalesName={loggedInSalesName}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Realtime clock and Mini-Leaderboard header */}
        <Header 
          title={getMenuTitle()} 
          transactions={filteredTransactions}
          onRefresh={() => syncSpreadsheetData(undefined, false, true)}
          loading={loading}
          onToggleSidebarMobile={() => setSidebarOpen(!sidebarOpen)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Content View wrapper */}
        <main className="p-3 sm:p-5 lg:p-8 flex-1 space-y-4 sm:space-y-6">
          
          {/* Warning Fallback Banner */}
          {bannerMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-start gap-3 text-xs font-semibold shadow-sm"
            >
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="flex-1 leading-relaxed">
                <span>{bannerMessage}</span>
              </div>
              <button 
                onClick={() => setBannerMessage(null)}
                className="text-amber-500 hover:text-amber-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Persistent Shared Date Sorting Widgets (only on relevant views like Dashboard, Penjualan, Kunjungan, Leaderboard, Logs, Operasional, Stok Gudang, Stok Sales, Setoran) */}
          {[1, 2, 3, 5, 8, 10, 11, 12, 14].includes(activeMenu) && (
            <FilterBar 
              filter={filter} 
              setFilter={setFilter} 
              totalRecords={filteredTransactions.length}
            />
          )}

          {/* Slide-fade Animated view router */}
          <div className="min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMenu}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {renderActiveMenu()}
              </motion.div>
            </AnimatePresence>
          </div>

        </main>
      </div>

      {/* Real-time In-App Floating Notification Toaster */}
      <div id="toast_container" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2.5 max-w-md w-[calc(100%-2rem)] pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast, idx) => (
            <motion.div
              key={`${toast.id}-${idx}`}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.15 } }}
              className="bg-slate-950/95 backdrop-blur-md border border-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3.5 pointer-events-auto relative overflow-hidden"
              style={{ boxShadow: '0 12px 30px -10px rgba(15, 23, 42, 0.6)' }}
            >
              <div className="p-2 bg-slate-900 rounded-xl shrink-0 text-amber-400">
                <Bell className="w-4 h-4 text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-400 truncate">Transaksi Baru</p>
                </div>
                <p className="text-xs font-bold text-slate-100 truncate mt-0.5">{toast.title.replace('🚨 ', '').replace('📊 ', '')}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{toast.body}</p>
              </div>

              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-850 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
