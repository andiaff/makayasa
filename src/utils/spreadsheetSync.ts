/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppConfig } from '../types';
import { getApiUrl } from './apiUrl';

// Map localStorage keys to spreadsheet tab names
export const SYNC_KEYS_MAP: Record<string, string> = {
  'makayasa_sales_deposits': 'Setoran Sales',
  'makayasa_stok_gudang': 'Stok Gudang',
  'makayasa_freelance_records': 'Manajemen Freelance',
  'makayasa_expenses': 'Keuangan'
};

// Flags to manage synchronization states
let isSyncingFromServer = false;

// Debounce timers per key to let rapid writes settle before uploading
const debounceTimers: Record<string, any> = {};
// Active sync promise chains per key to ensure sequential upload and avoid race conditions
const activeSyncPromises: Record<string, Promise<any> | null> = {};

export function queueTabSync(appScriptUrl: string, key: string, dataArray: any[]) {
  if (!appScriptUrl) return;

  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }

  debounceTimers[key] = setTimeout(() => {
    delete debounceTimers[key];

    const performSync = () => syncTabToSpreadsheet(appScriptUrl, key, dataArray);

    const handleSyncResult = (res: { success: boolean; message: string }) => {
      window.dispatchEvent(new CustomEvent('makayasa_sheet_sync_status', { 
        detail: { key, success: res.success, message: res.message } 
      }));
      return res;
    };

    if (activeSyncPromises[key]) {
      // Chain onto existing promise so uploads run sequentially in order
      activeSyncPromises[key] = activeSyncPromises[key]!.then(
        () => performSync().then(handleSyncResult),
        () => performSync().then(handleSyncResult) // Try even if previous sync failed
      );
    } else {
      activeSyncPromises[key] = performSync().then(
        (res) => { 
          activeSyncPromises[key] = null; 
          handleSyncResult(res);
          return res;
        },
        (err) => { 
          activeSyncPromises[key] = null; 
          handleSyncResult({ success: false, message: err.message || err });
          throw err;
        }
      );
    }
  }, 1500); // 1.5 seconds debounce
}

// Subscriptions for state updates
const updateCallbacks: Record<string, () => void> = {};

// Helper to check if two values are deeply equal, handling key order in objects and sorting arrays by ID to verify stable content equality
function isDataEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
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
 * Process fetched spreadsheet tab data and map it back into corresponding localStorage keys safely.
 */
export function updateLocalStatesFromData(allData: any, isManual = false): number {
  let updatedCount = 0;

  // Map the fetched tab data back into corresponding localStorage keys
  Object.entries(SYNC_KEYS_MAP).forEach(([localKey, tabName]) => {
    let tabData = allData[tabName] || [];

    // If we are loading 'makayasa_stok_gudang', also merge with the 'Stok Sales' tab data, ensuring no duplicates by ID
    if (localKey === 'makayasa_stok_gudang') {
      const salesTabData = allData['Stok Sales'] || [];
      const combined = [...tabData, ...salesTabData];
      const uniqueMap = new Map();
      combined.forEach(item => {
        if (item && item.id) {
          uniqueMap.set(item.id, item);
        }
      });
      tabData = Array.from(uniqueMap.values());
    }

    if (Array.isArray(tabData)) {
      // Safe parsing: ensure date objects are formatted in ISO strings
      let cleanedData = tabData.map((item: any) => {
        const newItem = { ...item };
        // Ensure numerical values are parsed correctly
        if (newItem.qtyPacksInPeriod !== undefined) newItem.qtyPacksInPeriod = parseInt(newItem.qtyPacksInPeriod, 10) || 0;
        if (newItem.totalOmsetInPeriod !== undefined) newItem.totalOmsetInPeriod = parseFloat(newItem.totalOmsetInPeriod) || 0;
        if (newItem.jumlahDisetor !== undefined) newItem.jumlahDisetor = parseFloat(newItem.jumlahDisetor) || 0;
        if (newItem.selisihSetoran !== undefined) newItem.selisihSetoran = parseFloat(newItem.selisihSetoran) || 0;
        
        if (newItem.jumlah !== undefined) newItem.jumlah = parseInt(newItem.jumlah, 10) || 0;
        
        if (newItem.qtyPacks !== undefined) newItem.qtyPacks = parseInt(newItem.qtyPacks, 10) || 0;
        if (newItem.pricePerPack !== undefined) newItem.pricePerPack = parseFloat(newItem.pricePerPack) || 0;
        if (newItem.totalOmset !== undefined) newItem.totalOmset = parseFloat(newItem.totalOmset) || 0;
        if (newItem.jumlahDibayar !== undefined) newItem.jumlahDibayar = parseInt(newItem.jumlahDibayar, 10) || 0;
        if (newItem.kurangBayar !== undefined) newItem.kurangBayar = parseInt(newItem.kurangBayar, 10) || 0;
        
        if (newItem.nominal !== undefined) newItem.nominal = parseFloat(newItem.nominal) || 0;
        
        // Boolean checks
        if (newItem.archived !== undefined) newItem.archived = String(newItem.archived) === 'true';
        if (newItem.potongStokGudang !== undefined) newItem.potongStokGudang = String(newItem.potongStokGudang) === 'true';
        if (newItem.hanyaSales !== undefined) newItem.hanyaSales = String(newItem.hanyaSales) === 'true';
        if (newItem.isReversed !== undefined) newItem.isReversed = String(newItem.isReversed) === 'true';

        return newItem;
      });

      // If loading 'makayasa_expenses', filter to keep only manual expenses (id starts with EXP-)
      if (localKey === 'makayasa_expenses') {
        cleanedData = cleanedData.filter((item: any) => item.id && String(item.id).startsWith('EXP-'));
      }

      // Check if there is a pending local write currently debouncing or uploading
      const hasPendingWrite = debounceTimers[localKey] || activeSyncPromises[localKey];

      if (!hasPendingWrite) {
        const localDataRaw = localStorage.getItem(localKey);
        const localData = localDataRaw ? JSON.parse(localDataRaw) : [];

        // Dynamic update check: if local state is different from the spreadsheet, overwrite local state with spreadsheet truth
        if (isManual || !isDataEqual(localData, cleanedData)) {
          console.log(`[SpreadsheetSync] Updating local state for "${localKey}" from spreadsheet (length: ${cleanedData.length})`);
          const prevSyncActive = (window as any).__makayasa_sync_active;
          (window as any).__makayasa_sync_active = true;
          
          localStorage.setItem(localKey, JSON.stringify(cleanedData));
          
          (window as any).__makayasa_sync_active = prevSyncActive;
          updatedCount++;
          
          // Trigger React component re-render
          window.dispatchEvent(new CustomEvent('makayasa_sync_update', { detail: { key: localKey } }));
        }
      } else {
        console.log(`[SpreadsheetSync] Skipping spreadsheet update for "${localKey}" because of an active pending local write.`);
      }
    }
  });

  return updatedCount;
}

/**
 * Fetch all data tabs from the Google Apps Script Web App
 */
export async function fetchAllFromSpreadsheet(appScriptUrl: string, isManual = false): Promise<{ success: boolean; message: string; data?: any }> {
  if (!appScriptUrl) {
    return { success: false, message: 'Google Apps Script URL belum dikonfigurasi.' };
  }

  isSyncingFromServer = true;
  try {
    let targetUrl = appScriptUrl.trim();
    
    // Auto-fix URL format if /exec is missing
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

    const separator = targetUrl.includes('?') ? '&' : '?';
    const fetchUrl = getApiUrl(`/api/proxy-appscript?url=${encodeURIComponent(targetUrl + separator + 'action=read_all')}`);
    let response = await fetch(fetchUrl);
    
    if (!response.ok && response.status === 404) {
      console.log(`[SpreadsheetSync] Proxy returned 404. Falling back to direct browser fetch for read_all...`);
      response = await fetch(targetUrl + separator + 'action=read_all');
    }
    
    if (!response.ok) {
      let errMsg = `HTTP error! status: ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.error) {
          errMsg = errorJson.error;
        }
      } catch (e) {
        // Response is not JSON
      }
      throw new Error(errMsg);
    }

    const resJson = await response.json();
    if (resJson.status !== 'success' || !resJson.data) {
      throw new Error(resJson.message || 'Gagal memuat data dari spreadsheet.');
    }

    const allData = resJson.data;
    const updatedCount = updateLocalStatesFromData(allData, isManual);

    console.log(`[SpreadsheetSync] Successfully fetched and updated ${updatedCount} tabs from Google Sheets.`);
    return { success: true, message: 'Berhasil menyinkronkan seluruh data dari Google Spreadsheet!', data: allData };
  } catch (err: any) {
    console.warn('[SpreadsheetSync] Failed to fetch data from spreadsheet:', err);
    return { success: false, message: `Gagal Sinkronisasi: ${err.message || err}` };
  } finally {
    isSyncingFromServer = false;
  }
}

/**
 * Write/Sync a single local array state back to a Google Sheet Tab via Web App API (direct helper)
 */
async function syncSingleTabDirect(appScriptUrl: string, tabName: string, dataArray: any[]): Promise<{ success: boolean; message: string }> {
  try {
    let targetUrl = appScriptUrl.trim();
    
    // Auto-fix URL format if /exec is missing
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

    console.log(`[SpreadsheetSync] Uploading tab "${tabName}" with ${dataArray.length} records...`);

    const payload = {
      action: 'sync_tab',
      tab: tabName,
      data: dataArray
    };

    let response = await fetch(getApiUrl('/api/proxy-appscript'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: targetUrl,
        ...payload
      })
    });

    if (!response.ok && response.status === 404) {
      console.log(`[SpreadsheetSync] Proxy returned 404. Falling back to direct browser fetch for POST to ${targetUrl}...`);
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) {
      let errMsg = `HTTP error! status: ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.error) {
          errMsg = errorJson.error;
        }
      } catch (e) {
        // Response is not JSON
      }

      if (response.status === 400 || response.status === 405) {
        throw new Error(
          `Gagal menyimpan ke Google Sheets (Status ${response.status}). Detail: ${errMsg}\n\nSilakan:\n1. Buka menu 'Pengaturan Sistem' di aplikasi ini\n2. Salin kode Google Apps Script terbaru\n3. Buka Google Sheets Anda > Ekstensi > Apps Script\n4. Ganti seluruh kode di sana dengan kode baru yang disalin\n5. Klik 'Terapkan' (Deploy) > 'Penerapan baru' (New deployment)\n6. Pilih tipe 'Web App', jalankan sebagai 'Saya', akses 'Siapa saja'\n7. Klik 'Terapkan', lalu salin URL Web App baru dan simpan di Pengaturan.`
        );
      }
      throw new Error(errMsg);
    }

    const resJson = await response.json();
    if (resJson.status !== 'success') {
      throw new Error(resJson.message || 'Gagal menyimpan data ke spreadsheet.');
    }

    console.log(`[SpreadsheetSync] Tab "${tabName}" synchronized successfully.`);
    return { success: true, message: `Berhasil menyimpan data ke sheet ${tabName}!` };
  } catch (err: any) {
    console.warn(`[SpreadsheetSync] Failed to sync tab ${tabName}:`, err);
    return { success: false, message: `Gagal menyimpan data ke sheet ${tabName}: ${err.message || err}` };
  }
}

/**
 * Gather manual expenses, sales deposits, and freelance payments into a consolidated cash book ledger and sync to 'Keuangan' tab
 */
export async function syncKeuanganTab(appScriptUrl: string): Promise<{ success: boolean; message: string }> {
  const expensesRaw = localStorage.getItem('makayasa_expenses') || '[]';
  const depositsRaw = localStorage.getItem('makayasa_sales_deposits') || '[]';
  const freelanceRaw = localStorage.getItem('makayasa_freelance_records') || '[]';
  
  try {
    const expenses = JSON.parse(expensesRaw);
    const deposits = JSON.parse(depositsRaw);
    const freelance = JSON.parse(freelanceRaw);
    
    // Create an intermediate list of transaction items with parsed Date objects
    interface IntermediateItem {
      id: string;
      dateObj: Date;
      tipe: 'Pemasukan' | 'Pengeluaran';
      nominal: number;
      keterangan: string;
    }
    
    const intermediate: IntermediateItem[] = [];
    
    const parseDateHelper = (val: any): Date => {
      if (!val) return new Date();
      const parsed = new Date(val);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };
    
    // 1. Manual Expenses (Pengeluaran)
    expenses.forEach((item: any) => {
      intermediate.push({
        id: item.id,
        dateObj: parseDateHelper(item.tanggal),
        tipe: 'Pengeluaran',
        nominal: item.nominal || 0,
        keterangan: item.keterangan || `Pengeluaran ${item.kategori || 'Operasional'}`
      });
    });
    
    // 2. Sales Deposits (Pemasukan)
    deposits
      .filter((dep: any) => dep.jumlahDisetor > 0 && !dep.archived)
      .forEach((dep: any) => {
        const startDate = dep.tanggalMulaiPeriode ? new Date(dep.tanggalMulaiPeriode) : null;
        const endDate = dep.tanggalSelesaiPeriode ? new Date(dep.tanggalSelesaiPeriode) : null;
        
        const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric', year: 'numeric' };
        const startStr = startDate && !isNaN(startDate.getTime()) ? startDate.toLocaleDateString('id-ID', formatOptions) : '';
        const endStr = endDate && !isNaN(endDate.getTime()) ? endDate.toLocaleDateString('id-ID', formatOptions) : '';
        
        intermediate.push({
          id: `INC-SALES-${dep.id}`,
          dateObj: parseDateHelper(dep.tanggalSetor),
          tipe: 'Pemasukan',
          nominal: dep.jumlahDisetor || 0,
          keterangan: `Setoran kas salesman: ${dep.salesName} (Periode ${startStr} - ${endStr})`
        });
      });
      
    // 3. Freelance Payments (Pemasukan)
    freelance
      .filter((rec: any) => rec.jumlahDibayar > 0 && !rec.archived)
      .forEach((rec: any) => {
        const incomeDate = rec.tanggalLunas ? rec.tanggalLunas : rec.tanggalAmbil;
        intermediate.push({
          id: `INC-FREE-${rec.id}`,
          dateObj: parseDateHelper(incomeDate),
          tipe: 'Pemasukan',
          nominal: rec.jumlahDibayar || 0,
          keterangan: `Setoran mitra freelance: ${rec.namaFreelance} (${rec.qtyPacks} Pack) ${rec.keterangan ? `- ${rec.keterangan}` : ''}`
        });
      });
      
    // Sort oldest first chronologically for natural running balance flow
    const sorted = intermediate.sort((a, b) => {
      const dateCompare = a.dateObj.getTime() - b.dateObj.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.id.localeCompare(b.id);
    });
    
    // Calculate running balance and map to final exact 6 columns requested
    let runningSaldo = 0;
    const finalConsolidated = sorted.map((item, index) => {
      const isIncome = item.tipe === 'Pemasukan';
      const pemasukan = isIncome ? item.nominal : 0;
      const pengeluaran = isIncome ? 0 : item.nominal;
      runningSaldo += (pemasukan - pengeluaran);
      
      return {
        nomor: index + 1,
        tanggal: item.dateObj.toISOString(), // ISO string for Apps Script date parsing
        keterangan: item.keterangan,
        pemasukan: pemasukan,
        pengeluaran: pengeluaran,
        saldo: runningSaldo
      };
    });
    
    return await syncSingleTabDirect(appScriptUrl, 'Keuangan', finalConsolidated);
  } catch (e: any) {
    console.warn('[SpreadsheetSync Keuangan] Error gathering consolidated data', e);
    return { success: false, message: `Gagal konsolidasi keuangan: ${e.message}` };
  }
}

/**
 * Gather sales deposits and freelance payments (setoran freelance) and sync to 'Setoran Sales' tab
 */
export async function syncSetoranSalesTab(appScriptUrl: string): Promise<{ success: boolean; message: string }> {
  const depositsRaw = localStorage.getItem('makayasa_sales_deposits') || '[]';
  const freelanceRaw = localStorage.getItem('makayasa_freelance_records') || '[]';
  
  try {
    const deposits = JSON.parse(depositsRaw);
    const freelance = JSON.parse(freelanceRaw);
    
    // 1. Map Sales Deposits
    const mappedDeposits = deposits.map((dep: any) => ({
      id: dep.id,
      tanggalSetor: dep.tanggalSetor,
      salesName: dep.salesName,
      tanggalMulaiPeriode: dep.tanggalMulaiPeriode,
      tanggalSelesaiPeriode: dep.tanggalSelesaiPeriode,
      qtyPacksInPeriod: dep.qtyPacksInPeriod,
      totalOmsetInPeriod: dep.totalOmsetInPeriod,
      jumlahDisetor: dep.jumlahDisetor,
      selisihSetoran: dep.selisihSetoran,
      statusSetoran: dep.statusSetoran,
      keterangan: dep.keterangan || 'Setoran sales',
      archived: dep.archived || false
    }));
    
    // 2. Map Freelance Payments (Setoran Freelance) where jumlahDibayar > 0
    const mappedFreelance = freelance
      .filter((rec: any) => rec.jumlahDibayar > 0)
      .map((rec: any) => {
        const incomeDate = rec.tanggalLunas ? rec.tanggalLunas : rec.tanggalAmbil;
        const statusStr = rec.statusPembayaran === 'Lunas' ? 'Lunas' : 'Kurang Setor';
        
        return {
          id: `DEP-FREE-${rec.id}`,
          tanggalSetor: incomeDate,
          salesName: `${rec.namaFreelance} (Freelance)`,
          tanggalMulaiPeriode: rec.tanggalAmbil,
          tanggalSelesaiPeriode: incomeDate,
          qtyPacksInPeriod: rec.qtyPacks,
          totalOmsetInPeriod: rec.totalOmset,
          jumlahDisetor: rec.jumlahDibayar,
          selisihSetoran: rec.kurangBayar,
          statusSetoran: statusStr,
          keterangan: rec.keterangan ? `Freelance: ${rec.keterangan}` : 'Setoran freelance',
          archived: rec.archived || false
        };
      });
      
    const consolidatedSetoran = [...mappedDeposits, ...mappedFreelance];
    
    return await syncSingleTabDirect(appScriptUrl, 'Setoran Sales', consolidatedSetoran);
  } catch (e: any) {
    console.warn('[SpreadsheetSync Setoran Sales] Error gathering consolidated setoran data', e);
    return { success: false, message: `Gagal konsolidasi setoran sales: ${e.message}` };
  }
}

/**
 * Write/Sync a single local array state back to a Google Sheet Tab via Web App API
 */
export async function syncTabToSpreadsheet(appScriptUrl: string, localKey: string, dataArray: any[]): Promise<{ success: boolean; message: string }> {
  if (!appScriptUrl) {
    return { success: false, message: 'Google Apps Script URL belum dikonfigurasi.' };
  }

  try {
    // 1. Handling of 'makayasa_stok_gudang' -> splits into 'Stok Gudang' and 'Stok Sales' tabs
    if (localKey === 'makayasa_stok_gudang') {
      // Heal the data array to fill missing fields retroactively and ensure consistency
      const healedDataArray = dataArray.map(item => {
        const newItem = { ...item };
        
        // Ensure boolean consistency for Hanya Sales and Is Reversed
        if (newItem.hanyaSales === undefined) newItem.hanyaSales = false;
        if (newItem.isReversed === undefined) newItem.isReversed = false;
        
        // Auto-extract salesName if missing but destination points to a Sales
        if (!newItem.salesName && newItem.sumberTujuan) {
          const dest = String(newItem.sumberTujuan).trim();
          if (dest.toLowerCase().startsWith('sales ')) {
            const parts = dest.split(' ');
            if (parts.length >= 2) {
              const candidate = parts.slice(1).join(' ').trim();
              if (candidate && candidate.toLowerCase() !== 'umum') {
                newItem.salesName = candidate;
              }
            }
          }
        }
        return newItem;
      });

      // Gudang data: All entries except those that are purely sales-only (hanyaSales === true)
      // This ensures all actual warehouse entries (both Masuk/in and Keluar/out - including those destined for sales) are recorded in Stok Gudang!
      const gudangData = healedDataArray.filter(item => !item.hanyaSales);
      
      // Sales data: Any entry that is destined for sales (either has salesName, or has hanyaSales === true, or destination is sales)
      const salesData = healedDataArray.filter(item => item.salesName || item.hanyaSales || (item.sumberTujuan && item.sumberTujuan.toLowerCase().trim().startsWith('sales')));
      
      const resGudang = await syncSingleTabDirect(appScriptUrl, 'Stok Gudang', gudangData);
      const resSales = await syncSingleTabDirect(appScriptUrl, 'Stok Sales', salesData);
      
      if (!resGudang.success) return resGudang;
      if (!resSales.success) return resSales;
      return { success: true, message: 'Berhasil menyimpan data ke sheet Stok Gudang & Stok Sales!' };
    }
    
    // 2. Handling of 'makayasa_expenses' -> gathers consolidated Keuangan (expenses + deposits + freelance)
    if (localKey === 'makayasa_expenses') {
      return await syncKeuanganTab(appScriptUrl);
    }
    
    // 3. Handling of 'makayasa_sales_deposits' -> syncs standard Setoran Sales tab AND updates consolidated Keuangan
    if (localKey === 'makayasa_sales_deposits') {
      const resDeposits = await syncSetoranSalesTab(appScriptUrl);
      await syncKeuanganTab(appScriptUrl);
      return resDeposits;
    }
    
    // 4. Handling of 'makayasa_freelance_records' -> syncs standard "Manajemen Freelance" tab AND updates consolidated Setoran Sales & Keuangan
    if (localKey === 'makayasa_freelance_records') {
      const resFreelance = await syncSingleTabDirect(appScriptUrl, 'Manajemen Freelance', dataArray);
      await syncSetoranSalesTab(appScriptUrl);
      await syncKeuanganTab(appScriptUrl);
      return resFreelance;
    }

    // Default fallback
    const tabName = SYNC_KEYS_MAP[localKey];
    if (!tabName) {
      return { success: false, message: `Key ${localKey} tidak terdaftar untuk sinkronisasi Google Sheets.` };
    }
    return await syncSingleTabDirect(appScriptUrl, tabName, dataArray);
  } catch (err: any) {
    console.warn(`[SpreadsheetSync] Failed to sync key ${localKey}:`, err);
    return { success: false, message: `Gagal menyimpan data: ${err.message || err}` };
  }
}

/**
 * Initialize Google Sheets Interceptors on localStorage
 */
export function initializeSpreadsheetSync() {
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function (key: string, value: string) {
    originalSetItem.apply(this, [key, value]);
    
    const isSyncActive = (window as any).__makayasa_sync_active === true;
    
    // Automatically intercept edits and push to Google Spreadsheet in real-time
    if (SYNC_KEYS_MAP[key] && !isSyncActive) {
      const configRaw = localStorage.getItem('makayasa_owner_config');
      if (configRaw) {
        try {
          const config = JSON.parse(configRaw) as AppConfig;
          if (config.appScriptUrl) {
            const dataArray = JSON.parse(value);
            if (Array.isArray(dataArray)) {
              queueTabSync(config.appScriptUrl, key, dataArray);
            }
          }
        } catch (e) {
          console.warn('[SpreadsheetSync Interceptor] Error parsing config or value for auto-sync', e);
        }
      }
    }
  };

  const originalRemoveItem = localStorage.removeItem;
  localStorage.removeItem = function (key: string) {
    originalRemoveItem.apply(this, [key]);
    
    const isSyncActive = (window as any).__makayasa_sync_active === true;
    
    if (SYNC_KEYS_MAP[key] && !isSyncActive) {
      const configRaw = localStorage.getItem('makayasa_owner_config');
      if (configRaw) {
        try {
          const config = JSON.parse(configRaw) as AppConfig;
          if (config.appScriptUrl) {
            queueTabSync(config.appScriptUrl, key, []);
          }
        } catch (e) {
          console.warn('[SpreadsheetSync Interceptor] Error syncing removal', e);
        }
      }
    }
  };

  console.log('[SpreadsheetSync] Interceptors initialized. Local changes will automatically write to Google Sheets.');
}
