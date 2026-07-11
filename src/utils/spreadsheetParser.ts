/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, AppConfig } from '../types';

// Extract Spreadsheet ID and GID from URL
export function parseSpreadsheetUrl(url: string): { sheetId: string; gid: string } {
  try {
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = url.match(/gid=([0-9]+)/);
    
    return {
      sheetId: sheetIdMatch ? sheetIdMatch[1] : '1ZS6Zk0vPlMER19uRdPLZHiXReZNnJsMwdaZhFZdCeus',
      gid: gidMatch ? gidMatch[1] : '1270404811',
    };
  } catch (e) {
    return {
      sheetId: '1ZS6Zk0vPlMER19uRdPLZHiXReZNnJsMwdaZhFZdCeus',
      gid: '1270404811',
    };
  }
}

// Generate high-fidelity realistic Indonesian distribution mock data
export function generateMockTransactions(pricePerPack: number): Transaction[] {
  const transactions: Transaction[] = [];
  const salesNames = ['Rico', 'Anwari', 'Subai', 'Hafan', 'Jefri'];
  
  const stores = [
    { name: 'Toko Berkah Utama', address: 'Jl. Merdeka No. 42, Kec. Semarang Tengah, Semarang', region: 'Semarang', statusToko: 'Toko / Outlet' as const },
    { name: 'Sembako Jaya Abadi', address: 'Jl. Pemuda No. 120, Kec. Jati, Kudus', region: 'Kudus', statusToko: 'Toko / Outlet' as const },
    { name: 'Warung Pojok Makmur', address: 'Jl. Kartini No. 5, Kec. Karangtengah, Demak', region: 'Demak', statusToko: 'Toko / Outlet' as const },
    { name: 'Toko Sumber Rejeki', address: 'Jl. Sunan Kudus No. 88, Kec. Kota Kudus, Kudus', region: 'Kudus', statusToko: 'Toko / Outlet' as const },
    { name: 'Bapak Budi (Konsumen)', address: 'Jl. Ahmad Yani No. 12, Kec. Margorejo, Pati', region: 'Pati', statusToko: 'Konsumen / End User' as const },
    { name: 'Toko Lestari Sejahtera', address: 'Jl. Diponegoro No. 14, Kec. Tahunan, Jepara', region: 'Jepara', statusToko: 'Toko / Outlet' as const },
    { name: 'Warung Kelontong Asri', address: 'Jl. Gajah Mada No. 9, Kec. Banyumanik, Semarang', region: 'Semarang', statusToko: 'Toko / Outlet' as const },
    { name: 'Ibu Siti (Konsumen)', address: 'Jl. Raden Patah No. 34, Kec. Demak Kota, Demak', region: 'Demak', statusToko: 'Konsumen / End User' as const },
    { name: 'Toko Murah Rezeki', address: 'Jl. Pahlawan No. 31, Kec. Pati Kota, Pati', region: 'Pati', statusToko: 'Toko / Outlet' as const },
    { name: 'Grosir Rokok Sejati', address: 'Jl. Kolonel Sugiono No. 45, Kec. Pecangaan, Jepara', region: 'Jepara', statusToko: 'Toko / Outlet' as const },
    { name: 'Toko Rahayu Sentosa', address: 'Jl. MT Haryono No. 112, Kec. Tembalang, Semarang', region: 'Semarang', statusToko: 'Toko / Outlet' as const },
    { name: 'Ibu Ratna (Konsumen)', address: 'Jl. Kyai Mojo No. 22, Kec. Bae, Kudus', region: 'Kudus', statusToko: 'Konsumen / End User' as const },
    { name: 'Toko Berdikari', address: 'Jl. Sultan Agung No. 70, Kec. Karanganyar, Demak', region: 'Demak', statusToko: 'Toko / Outlet' as const },
    { name: 'Sembako Harapan Kita', address: 'Jl. Ahmad Yani No. 55, Kec. Juwana, Pati', region: 'Pati', statusToko: 'Toko / Outlet' as const },
    { name: 'Kios Makayasa Kudus', address: 'Jl. Sunan Muria No. 12, Kec. Gebog, Kudus', region: 'Kudus', statusToko: 'Toko / Outlet' as const },
  ];

  const statuses: ('Baru Order' | 'Tidak Order' | 'Repeat Order')[] = [
    'Baru Order',
    'Tidak Order',
    'Repeat Order',
    'Repeat Order', // weight repeat higher for realism
  ];

  // Generate data exactly across 60 days (covering late April, May, and June 2026)
  const baseDate = new Date('2026-06-27T12:00:00');
  
  for (let i = 0; i < 450; i++) {
    // Distribute 450 transactions evenly across 60 days (~7.5 transactions per day)
    const daysOffset = Math.floor(i / 7.5) % 60; 
    const txDate = new Date(baseDate);
    txDate.setDate(baseDate.getDate() - daysOffset);
    // Add some random hours
    txDate.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));

    const salesName = salesNames[i % salesNames.length];
    
    // Pick store based on index to ensure specific sales cover specific areas
    const storeIdx = (i + (salesNames.indexOf(salesName) * 3)) % stores.length;
    const store = stores[storeIdx];
    
    // Choose status based on randomness and index
    const rand = Math.random();
    let status: 'Baru Order' | 'Tidak Order' | 'Repeat Order';
    if (rand < 0.15) {
      status = 'Tidak Order';
    } else if (rand < 0.65) {
      status = 'Repeat Order';
    } else {
      status = 'Baru Order';
    }

    // Determine Qty of cigarette packs (priced at Rp 6000)
    // Ordered amount is usually between 10 to 150 packs
    let qtyPacks = 0;
    if (status !== 'Tidak Order') {
      const isLargeStore = store.name.includes('Grosir') || store.name.includes('Utama') || store.name.includes('Abadi');
      const multiplier = isLargeStore ? 4 : 1;
      qtyPacks = (10 + Math.floor(Math.random() * 25)) * multiplier;
    }

    const omset = qtyPacks * pricePerPack;

    let mockKecamatan = undefined;
    const match = store.address.match(/(?:kecamatan|kec\.)\s+([a-zA-Z0-9\s\-]+?)(?:,|$|\d)/i);
    if (match && match[1]) {
      mockKecamatan = match[1].trim();
    }
    const mockDesa = store.name.includes('Berkah') ? 'Sumberjamber' : store.name.includes('Sembako') ? 'Randuagung' : store.name.includes('Warung') ? 'Gambiran' : 'Sidomulyo';

    transactions.push({
      id: `TX-${100000 + i}`,
      tanggal: txDate,
      salesName,
      storeName: store.name,
      storeAddress: store.address,
      qtyPacks,
      omset,
      statusKunjungan: status,
      kecamatan: mockKecamatan,
      desa: mockDesa,
      statusToko: store.statusToko
    });
  }

  // Sort by date descending
  return transactions.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());
}

// Client-side CSV parser that processes CSV files fetched from google sheets
export function parseCSVToTransactions(csvText: string, pricePerPack: number): Transaction[] {
  const transactions: Transaction[] = [];
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse headers
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  
  // Find indices for target metrics
  const dateIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('timestamp') || h.includes('date') || h.includes('waktu'));
  const salesIdx = headers.findIndex(h => h.includes('sales') || h.includes('nama sales') || h.includes('salesman'));
  const storeIdx = headers.findIndex(h => h.includes('toko') || h.includes('nama toko') || h.includes('outlet') || h.includes('store'));
  const addressIdx = headers.findIndex(h => h.includes('alamat') || h.includes('wilayah') || h.includes('address') || h.includes('lokasi'));
  const qtyIdx = headers.findIndex(h => h.includes('penjualan') || h.includes('qty') || h.includes('jumlah') || h.includes('pack') || h.includes('pak') || h.includes('order'));
  
  // Prioritize 'hasil' or 'hasil kunjungan' first, then kunjungan columns (excluding 'status toko'), then general status/tipe/keterangan
  let statusIdx = headers.findIndex(h => h.includes('hasil') || h.includes('hasil kunjungan'));
  if (statusIdx === -1) {
    statusIdx = headers.findIndex(h => h.includes('kunjungan') && !h.includes('status toko'));
  }
  if (statusIdx === -1) {
    statusIdx = headers.findIndex(h => h.includes('status') || h.includes('tipe') || h.includes('keterangan'));
  }

  const kecamatanIdx = headers.findIndex(h => h.includes('kecamatan') || h === 'kec');
  const desaIdx = headers.findIndex(h => h.includes('desa') || h.includes('kelurahan') || h === 'kel');
  const transaksiKeIdx = headers.findIndex(h => h.includes('transaksi ke') || h.includes('berapa'));
  const statusTokoIdx = headers.findIndex(h => h.includes('status toko') || h.includes('status_toko') || h.includes('tipe toko'));

  // Fallback map if indices are missing
  const activeDateIdx = dateIdx !== -1 ? dateIdx : 0;
  const activeSalesIdx = salesIdx !== -1 ? salesIdx : 1;
  const activeStoreIdx = storeIdx !== -1 ? storeIdx : 2;
  const activeAddressIdx = addressIdx !== -1 ? addressIdx : 3;
  const activeQtyIdx = qtyIdx !== -1 ? qtyIdx : 4;
  const activeStatusIdx = statusIdx !== -1 ? statusIdx : 5;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = parseCSVLine(line);
    if (cells.length < 3) continue;

    // Parse date
    let dateVal = new Date();
    if (cells[activeDateIdx]) {
      const parsedDate = Date.parse(cells[activeDateIdx]);
      if (!isNaN(parsedDate)) {
        dateVal = new Date(parsedDate);
      } else {
        // Try indonesian format dd/mm/yyyy
        const parts = cells[activeDateIdx].split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            dateVal = new Date(year, month, day);
          }
        }
      }
    }

    const salesName = cells[activeSalesIdx] ? cells[activeSalesIdx].trim() : 'Sales Tak Dikenal';
    const storeName = cells[activeStoreIdx] ? cells[activeStoreIdx].trim() : 'Toko Umum';
    const storeAddress = cells[activeAddressIdx] ? cells[activeAddressIdx].trim() : 'Alamat Toko';
    const kecamatan = kecamatanIdx !== -1 && cells[kecamatanIdx] ? cells[kecamatanIdx].trim() : undefined;
    const desa = desaIdx !== -1 && cells[desaIdx] ? cells[desaIdx].trim() : undefined;
    const transaksiKe = transaksiKeIdx !== -1 && cells[transaksiKeIdx] ? cells[transaksiKeIdx].trim() : undefined;
    
    // Parse quantity
    let qtyPacks = 0;
    if (cells[activeQtyIdx]) {
      const num = parseInt(cells[activeQtyIdx].replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) qtyPacks = num;
    }

    // Parse status
    let statusRaw = cells[activeStatusIdx] ? cells[activeStatusIdx].trim().toLowerCase() : 'baru order';
    let statusKunjungan: 'Baru Order' | 'Tidak Order' | 'Repeat Order' = 'Baru Order';

    if (statusRaw.includes('tidak') || statusRaw.includes('no') || statusRaw.includes('beli') || statusRaw.includes('rusak') || statusRaw.includes('revisi') || statusRaw.includes('batal') || statusRaw.includes('cancel') || statusRaw.includes('retur') || statusRaw.includes('dibatalkan') || qtyPacks === 0) {
      statusKunjungan = 'Tidak Order';
    } else if (statusRaw.includes('repeat') || statusRaw.includes('langganan') || statusRaw.includes('ro') || statusRaw.includes('kembali')) {
      statusKunjungan = 'Repeat Order';
    } else if (statusRaw.includes('baru') || statusRaw.includes('first') || statusRaw.includes('order')) {
      statusKunjungan = 'Baru Order';
    } else {
      statusKunjungan = 'Baru Order';
    }

    // Overwrite qty to 0 if "Tidak Order"
    if (statusKunjungan === 'Tidak Order') {
      qtyPacks = 0;
    }

    // Parse status toko (Toko / Outlet vs Konsumen / End User)
    let statusToko: 'Toko / Outlet' | 'Konsumen / End User' = 'Toko / Outlet';
    
    // Support a wider array of header checks for status toko
    const actualStatusTokoIdx = headers.findIndex(h => {
      return h.includes('status toko') || 
             h.includes('status_toko') || 
             h.includes('tipe toko') || 
             h.includes('kategori toko') || 
             h.includes('tipe_toko') ||
             h.includes('klasifikasi');
    });

    const activeStatusTokoIdx = actualStatusTokoIdx !== -1 ? actualStatusTokoIdx : statusTokoIdx;

    let rawStatusToko = '';
    if (activeStatusTokoIdx !== -1 && cells[activeStatusTokoIdx]) {
      rawStatusToko = cells[activeStatusTokoIdx].trim();
      const stVal = rawStatusToko.toLowerCase();
      if (stVal.includes('konsumen') || stVal.includes('end user') || stVal.includes('user') || stVal.includes('pribadi') || stVal.includes('ecer')) {
        statusToko = 'Konsumen / End User';
      } else {
        statusToko = 'Toko / Outlet';
      }
    } else {
      // Check if any cell in this row is literally 'konsumen', 'end user' etc.
      let foundKonsumenCell = false;
      for (const cell of cells) {
        if (cell) {
          const valStr = cell.trim().toLowerCase();
          if (valStr === 'konsumen' || valStr === 'end user' || valStr === 'pribadi' || valStr === 'konsumen / end user') {
            foundKonsumenCell = true;
            break;
          }
        }
      }

      const stName = storeName.toLowerCase();
      if (foundKonsumenCell || stName.includes('konsumen') || stName.includes('end user') || stName.includes('user') || stName.includes('pribadi')) {
        statusToko = 'Konsumen / End User';
        rawStatusToko = 'Konsumen';
      } else {
        rawStatusToko = 'Toko';
      }
    }

    const omset = qtyPacks * pricePerPack;

    const timeToken = dateVal ? dateVal.getTime() : i;
    const cleanSales = salesName.replace(/[^a-zA-Z0-9]/g, '');
    const cleanStore = storeName.replace(/[^a-zA-Z0-9]/g, '');
    const stableId = `TX-${cleanSales}-${cleanStore}-${timeToken}`;

    transactions.push({
      id: stableId,
      tanggal: dateVal,
      salesName,
      storeName,
      storeAddress,
      qtyPacks,
      omset,
      statusKunjungan,
      kecamatan,
      desa,
      transaksiKe,
      statusToko,
      rawStatusToko,
    });
  }

  // Sort by date descending
  return transactions.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());
}

// Safely parse CSV line supporting quotes and commas inside quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Filter transactions by date logic
export function filterTransactions(transactions: Transaction[], filterType: 'today' | 'yesterday' | 'range' | 'week' | 'month', startDateStr?: string, endDateStr?: string): Transaction[] {
  const referenceDate = new Date(); // Dynamic local system date as requested
  
  return transactions.filter(tx => {
    const txDate = new Date(tx.tanggal);
    
    // Set hours to 0 to compare days easily
    const txDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()).getTime();
    const refDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();

    if (filterType === 'today') {
      return txDay === refDay;
    } else if (filterType === 'yesterday') {
      const yesterdayDay = refDay - (1 * 24 * 60 * 60 * 1000);
      return txDay === yesterdayDay;
    } else if (filterType === 'week') {
      const sevenDaysAgo = refDay - (7 * 24 * 60 * 60 * 1000);
      return txDay >= sevenDaysAgo && txDay <= refDay;
    } else if (filterType === 'month') {
      const thirtyDaysAgo = refDay - (30 * 24 * 60 * 60 * 1000);
      return txDay >= thirtyDaysAgo && txDay <= refDay;
    } else if (filterType === 'range') {
      if (!startDateStr || !endDateStr) return true;
      const parseLocalDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
        return new Date(dateStr);
      };
      const start = parseLocalDate(startDateStr).getTime();
      const end = parseLocalDate(endDateStr).getTime();
      return txDay >= start && txDay <= end;
    }
    
    return true;
  });
}

// Format Currency to Indonesian Rupiah (IDR)
export function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Format Date standard Indonesian
export function formatDateIndo(dateInput: Date | string): string {
  const date = new Date(dateInput);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
