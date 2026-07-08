/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  PlusCircle, 
  MinusCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Database, 
  FileSpreadsheet, 
  Trash2, 
  RefreshCw, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  SlidersHorizontal,
  Calendar,
  Layers,
  Sparkles,
  ClipboardCheck,
  Import,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Transaction, StockEntry } from '../types';
import { formatIDR } from '../utils/spreadsheetParser';
import { getApiUrl } from '../utils/apiUrl';

interface StokGudangProps {
  transactions: Transaction[];
  salesNames?: string[];
}

const STORAGE_STOCK_KEY = 'makayasa_stok_gudang';
const STORAGE_MIN_STOCK_KEY = 'makayasa_min_stock_alert';

export default function StokGudang({ transactions, salesNames }: StokGudangProps) {
  // --- STATE ---
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [minStockAlert, setMinStockAlert] = useState<number>(500); // 500 packs warning limit
  const [activeFormTab, setActiveFormTab] = useState<'app' | 'spreadsheet'>('app');
  
  // Custom dialog state to prevent iframe confirm/alert issues
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    onConfirm: () => {}
  });
  
  // App Input Form state
  const [formType, setFormType] = useState<'Masuk' | 'Keluar'>('Masuk');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formSource, setFormSource] = useState<string>('Pabrik Makayasa');
  const [formQty, setFormQty] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  
  // Spreadsheet paste state
  const [pastedData, setPastedData] = useState<string>('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);

  // Custom spreadsheet URL sync state
  const [stockSheetUrl, setStockSheetUrl] = useState<string>('https://docs.google.com/spreadsheets/d/1ZS6Zk0vPlMER19uRdPLZHiXReZNnJsMwdaZhFZdCeus/edit');
  const [stockSheetGid, setStockSheetGid] = useState<string>('0'); // default sheet 1
  const [isSyncingUrl, setIsSyncingUrl] = useState<boolean>(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'Semua' | 'Masuk' | 'Keluar'>('Semua');
  const [filterSource, setFilterSource] = useState<'Semua' | 'Aplikasi' | 'Spreadsheet'>('Semua');

  // List of active sales
  const activeSales = useMemo(() => {
    if (salesNames && salesNames.length > 0) return salesNames;
    return Array.from(new Set(transactions.map(tx => tx.salesName).filter(name => name && name !== 'Sales Tak Dikenal')));
  }, [transactions, salesNames]);

  // Handle default source based on type
  useEffect(() => {
    if (formType === 'Masuk') {
      setFormSource('Pabrik Makayasa');
    } else {
      setFormSource(activeSales[0] ? `Sales ${activeSales[0]}` : 'Sales Umum');
    }
  }, [formType, activeSales]);

  // --- PERSISTENCE & INITIAL SEEDING ---
  const loadStockEntries = () => {
    const savedEntries = localStorage.getItem(STORAGE_STOCK_KEY);
    if (savedEntries) {
      try {
        const parsed = JSON.parse(savedEntries) as any[];
        // Re-convert date strings back to Date objects
        const hydrated = parsed.map(entry => ({
          ...entry,
          tanggal: new Date(entry.tanggal)
        }));

        // Filter out any mock/seeded stock data completely
        const filtered = hydrated.filter(entry => {
          const id = entry.id || '';
          const isMock = 
            id.startsWith('STK-IN-100') || 
            id.startsWith('STK-OUT-MISC-300') || 
            id.startsWith('STK-OUT-200') ||
            id.startsWith('STK-OUT-MISC-3000') ||
            id.startsWith('STK-OUT-MISC-3001') ||
            (entry.sumberTujuan === 'Pabrik Makayasa' && (entry.jumlah === 3000 || entry.jumlah === 2500 || entry.jumlah === 2000)) ||
            (entry.keterangan && (
              entry.keterangan.includes('Pengiriman kontainer pertama') ||
              entry.keterangan.includes('Restock mingguan reguler') ||
              entry.keterangan.includes('Penerimaan stok tambahan') ||
              entry.keterangan.includes('Restock akhir bulan') ||
              entry.keterangan.includes('Sempel promosi event car free day') ||
              entry.keterangan.includes('Pemusnahan rokok penyok') ||
              entry.keterangan.includes('Ambil barang sales')
            ));
          return !isMock;
        });

        // Write back if changes were made
        if (JSON.stringify(filtered) !== JSON.stringify(parsed)) {
          localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify(filtered));
        }

        setStockEntries(filtered);
      } catch (e) {
        console.error('Failed to load stock entries:', e);
      }
    } else {
      setStockEntries([]);
    }
  };

  useEffect(() => {
    // 1. Load Minimum Stock Warning Limit
    const savedMinStock = localStorage.getItem(STORAGE_MIN_STOCK_KEY);
    if (savedMinStock) {
      setMinStockAlert(parseInt(savedMinStock, 10) || 500);
    }

    // 2. Load Stock Entries from LocalStorage
    const savedEntries = localStorage.getItem(STORAGE_STOCK_KEY);
    if (savedEntries) {
      loadStockEntries();
    } else {
      seedDefaultStock();
    }
  }, [transactions]);

  // Sync update listener
  useEffect(() => {
    const handleSyncUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && (customEvent.detail.key === STORAGE_STOCK_KEY || customEvent.detail.key === STORAGE_MIN_STOCK_KEY)) {
        loadStockEntries();
        if (customEvent.detail.key === STORAGE_MIN_STOCK_KEY) {
          const savedMinStock = localStorage.getItem(STORAGE_MIN_STOCK_KEY);
          if (savedMinStock) {
            setMinStockAlert(parseInt(savedMinStock, 10) || 500);
          }
        }
      }
    };
    window.addEventListener('makayasa_sync_update', handleSyncUpdate);
    return () => {
      window.removeEventListener('makayasa_sync_update', handleSyncUpdate);
    };
  }, []);

  // Seed realistic stock history that acts as application-level default initial data (empty by default)
  const seedDefaultStock = () => {
    setStockEntries([]);
    localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify([]));
  };

  // Helper to save stock entries and sync with local storage
  const saveEntries = (newEntries: StockEntry[]) => {
    const sorted = [...newEntries].sort((a, b) => {
      const dateA = a.tanggal instanceof Date ? a.tanggal : new Date(a.tanggal);
      const dateB = b.tanggal instanceof Date ? b.tanggal : new Date(b.tanggal);
      return dateB.getTime() - dateA.getTime();
    });
    setStockEntries(sorted);
    localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify(sorted));
  };

  // --- ACTIONS ---
  
  // 1. Create a stock entry from the app
  const handleAddAppStock = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = parseInt(formQty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setModalState({
        isOpen: true,
        title: 'Input Tidak Valid',
        message: 'Jumlah pack harus berupa angka positif!',
        type: 'alert',
        onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const normalizedSource = formSource.trim() || (formType === 'Masuk' ? 'Pabrik Utama' : 'Sales Umum');
    let extractedSalesName: string | undefined = undefined;
    
    // Automatically extract sales name if source/destination starts with "Sales "
    if (normalizedSource.startsWith('Sales ')) {
      const parts = normalizedSource.split(' ');
      if (parts.length >= 2) {
        const candidate = parts.slice(1).join(' ').trim();
        if (candidate && candidate.toLowerCase() !== 'umum') {
          extractedSalesName = candidate;
        }
      }
    }

    const newEntry: StockEntry = {
      id: `STK-APP-${Date.now()}`,
      tanggal: new Date(formDate),
      tipe: formType,
      sumberTujuan: normalizedSource,
      jumlah: parsedQty,
      keterangan: formDesc.trim() || (formType === 'Masuk' ? 'Stok masuk manual dari aplikasi' : 'Stok keluar manual dari aplikasi'),
      sumberInput: 'Aplikasi',
      hanyaSales: false,
      isReversed: false,
      salesName: extractedSalesName
    };

    const updated = [newEntry, ...stockEntries];
    saveEntries(updated);
    
    // Reset Form
    setFormQty('');
    setFormDesc('');
    setIsFormSubmitted(true);
    setTimeout(() => setIsFormSubmitted(false), 3000);
  };

  // 2. Parse copy-pasted spreadsheet cells (TSV / CSV format)
  const handlePasteImport = (e: React.FormEvent) => {
    e.preventDefault();
    setPasteError(null);
    setPasteSuccess(null);

    if (!pastedData.trim()) {
      setPasteError('Silakan tempel data tabel terlebih dahulu!');
      return;
    }

    try {
      const rows = pastedData.split(/\r?\n/);
      const parsedEntries: StockEntry[] = [];
      let successCount = 0;

      rows.forEach((row, rowIndex) => {
        const line = row.trim();
        if (!line) return;

        // Split by Tab (excel copy paste) or comma
        const cells = line.split(/\t|,/);
        if (cells.length < 3) return; // Need at least: Date, Type, Qty

        // Skip headers if the row contains labels like 'tanggal', 'tipe', or 'jumlah'
        const lowerFirst = cells[0].toLowerCase();
        if (lowerFirst.includes('tanggal') || lowerFirst.includes('date') || lowerFirst.includes('tipe') || lowerFirst.includes('type')) {
          return;
        }

        // 1. Parse date
        let parsedDate = new Date();
        const rawDate = cells[0].trim();
        const milliseconds = Date.parse(rawDate);
        if (!isNaN(milliseconds)) {
          parsedDate = new Date(milliseconds);
        } else {
          // Try DD/MM/YYYY
          const dParts = rawDate.split('/');
          if (dParts.length === 3) {
            const day = parseInt(dParts[0], 10);
            const month = parseInt(dParts[1], 10) - 1;
            const year = parseInt(dParts[2], 10);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              parsedDate = new Date(year, month, day);
            }
          }
        }

        // 2. Parse Type (Masuk / Keluar)
        const rawType = cells[1].trim().toLowerCase();
        let tipe: 'Masuk' | 'Keluar' = 'Keluar';
        if (rawType.includes('masuk') || rawType.includes('in') || rawType.includes('pabrik')) {
          tipe = 'Masuk';
        }

        // 3. Parse Qty (Jumlah)
        let qty = 0;
        // Find cells with numbers
        for (let i = 2; i < cells.length; i++) {
          const num = parseInt(cells[i].replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num > 0) {
            qty = num;
            break;
          }
        }

        if (qty <= 0) return;

        // 4. Source & Description
        // Try to fetch remaining columns or use defaults
        const sumberTujuan = cells[3] ? cells[3].trim() : (tipe === 'Masuk' ? 'Pabrik (Import)' : 'Sales (Import)');
        const keterangan = cells[4] ? cells[4].trim() : 'Diimport via copy-paste spreadsheet';

        parsedEntries.push({
          id: `STK-PST-${Date.now()}-${rowIndex}`,
          tanggal: parsedDate,
          tipe,
          sumberTujuan,
          jumlah: qty,
          keterangan,
          sumberInput: 'Spreadsheet'
        });

        successCount++;
      });

      if (parsedEntries.length === 0) {
        setPasteError('Tidak ada baris data valid yang terdeteksi. Pastikan kolom minimal berisi: Tanggal, Tipe (Masuk/Keluar), Jumlah (Angka).');
        return;
      }

      // Merge and save
      const merged = [...parsedEntries, ...stockEntries];
      saveEntries(merged);
      setPastedData('');
      setPasteSuccess(`Sukses mengimport ${successCount} baris pencatatan stok baru dari spreadsheet!`);
    } catch (err: any) {
      setPasteError(`Gagal membaca format tabel: ${err.message || err}`);
    }
  };

  // 3. Sync from Stock Spreadsheet URL (via Proxy)
  const handleUrlSync = async () => {
    setIsSyncingUrl(true);
    setPasteError(null);
    setPasteSuccess(null);

    try {
      // Format a spreadsheet URL to export to CSV
      const sheetIdMatch = stockSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const sheetId = sheetIdMatch ? sheetIdMatch[1] : null;

      if (!sheetId) {
        throw new Error('Format URL spreadsheet tidak valid.');
      }

      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${stockSheetGid}`;
      const proxyUrl = getApiUrl(`/api/proxy-appscript?url=${encodeURIComponent(csvUrl)}`);

      const res = await fetch(proxyUrl);
      if (!res.ok) {
        throw new Error('Gagal menghubungi Google Sheets. Pastikan spreadsheet di-share "Siapa saja dengan link dapat melihat".');
      }

      const csvText = await res.text();
      const lines = csvText.split(/\r?\n/);
      if (lines.length < 2) {
        throw new Error('Dokumen spreadsheet kosong atau baris tidak cukup.');
      }

      const parsedEntries: StockEntry[] = [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Try to find column mapping
      const dateIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('date') || h.includes('waktu'));
      const typeIdx = headers.findIndex(h => h.includes('tipe') || h.includes('jenis') || h.includes('type') || h.includes('status'));
      const qtyIdx = headers.findIndex(h => h.includes('jumlah') || h.includes('qty') || h.includes('volume') || h.includes('pack'));
      const sourceIdx = headers.findIndex(h => h.includes('sumber') || h.includes('tujuan') || h.includes('sales') || h.includes('penerima'));
      const descIdx = headers.findIndex(h => h.includes('keterangan') || h.includes('note') || h.includes('deskripsi'));

      const activeDateIdx = dateIdx !== -1 ? dateIdx : 0;
      const activeTypeIdx = typeIdx !== -1 ? typeIdx : 1;
      const activeQtyIdx = qtyIdx !== -1 ? qtyIdx : 2;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV splitter
        const cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (cells.length < 3) continue;

        // Parse Date
        let tanggal = new Date();
        const rawDate = cells[activeDateIdx] ? cells[activeDateIdx].replace(/"/g, '').trim() : '';
        const ms = Date.parse(rawDate);
        if (!isNaN(ms)) {
          tanggal = new Date(ms);
        }

        // Parse Type
        const rawType = cells[activeTypeIdx] ? cells[activeTypeIdx].replace(/"/g, '').trim().toLowerCase() : '';
        const tipe: 'Masuk' | 'Keluar' = (rawType.includes('masuk') || rawType.includes('in') || rawType.includes('pabrik')) ? 'Masuk' : 'Keluar';

        // Parse Qty
        const rawQty = cells[activeQtyIdx] ? cells[activeQtyIdx].replace(/"/g, '').trim() : '';
        const jumlah = parseInt(rawQty.replace(/[^0-9]/g, ''), 10) || 0;

        if (jumlah <= 0) continue;

        // Parse Source & Desc
        const sumberTujuan = sourceIdx !== -1 && cells[sourceIdx] 
          ? cells[sourceIdx].replace(/"/g, '').trim() 
          : (tipe === 'Masuk' ? 'Pabrik Kudus' : 'Sales Utama');
        
        const keterangan = descIdx !== -1 && cells[descIdx] 
          ? cells[descIdx].replace(/"/g, '').trim() 
          : 'Disinkronkan otomatis dari spreadsheet';

        parsedEntries.push({
          id: `STK-URL-${Date.now()}-${i}`,
          tanggal,
          tipe,
          sumberTujuan,
          jumlah,
          keterangan,
          sumberInput: 'Spreadsheet'
        });
      }

      if (parsedEntries.length === 0) {
        throw new Error('Kolom spreadsheet tidak dapat dibaca. Pastikan terdapat kolom: Tanggal, Tipe, dan Jumlah.');
      }

      // Merge and save
      const merged = [...parsedEntries, ...stockEntries];
      saveEntries(merged);
      setPasteSuccess(`Berhasil menyinkronkan ${parsedEntries.length} baris pencatatan stok dari URL Google Sheets!`);
    } catch (err: any) {
      setPasteError(err.message || 'Gagal sinkronisasi data.');
    } finally {
      setIsSyncingUrl(false);
    }
  };

  // 4. Reverse / Delete individual stock entry (with history preserved!)
  const handleDeleteEntry = (id: string) => {
    const targetEntry = stockEntries.find(e => e.id === id);
    if (!targetEntry) return;

    setModalState({
      isOpen: true,
      title: 'Batalkan & Reverse Pencatatan?',
      message: `Apakah Anda yakin ingin membatalkan transaksi ${targetEntry.tipe === 'Masuk' ? 'Stok Masuk' : 'Stok Keluar'} sebesar ${targetEntry.jumlah} Pack ini? Transaksi akan dinonaktifkan secara sistem sehingga tidak lagi memengaruhi perhitungan stok, namun catatan riwayatnya tetap utuh sebagai arsip audit laporan.`,
      type: 'confirm',
      onConfirm: () => {
        const updated = stockEntries.map(e => {
          if (e.id === id) {
            return {
              ...e,
              isReversed: true,
              reversedAt: new Date().toISOString()
            };
          }
          return e;
        });
        saveEntries(updated);
        setModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 4.5 Clear all stock entries entirely
  const handleClearAllStock = () => {
    setModalState({
      isOpen: true,
      title: 'Kosongkan Data Stok',
      message: 'Apakah Anda yakin ingin menghapus dan mengosongkan seluruh pencatatan stok gudang?',
      type: 'confirm',
      onConfirm: () => {
        setStockEntries([]);
        localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify([]));
        setModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 5. Reset inventory entirely to Default Demo Data
  const handleResetInventory = () => {
    setModalState({
      isOpen: true,
      title: 'Reset Simulasi Stok',
      message: 'Ingin mereset seluruh pencatatan stok gudang ke data simulasi bawaan? Semua data input manual akan dihapus.',
      type: 'confirm',
      onConfirm: () => {
        seedDefaultStock();
        setModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // 6. Handle change in Minimum stock threshold
  const handleUpdateMinStock = (val: number) => {
    setMinStockAlert(val);
    localStorage.setItem(STORAGE_MIN_STOCK_KEY, val.toString());
  };

  // --- DERIVED METRICS ---
  
  // Total incoming stock
  const totalStockMasuk = useMemo(() => {
    return stockEntries
      .filter(e => e.tipe === 'Masuk' && !e.hanyaSales && !e.isReversed)
      .reduce((sum, e) => sum + e.jumlah, 0);
  }, [stockEntries]);

  // Total outgoing stock
  const totalStockKeluar = useMemo(() => {
    return stockEntries
      .filter(e => e.tipe === 'Keluar' && !e.hanyaSales && !e.isReversed)
      .reduce((sum, e) => sum + e.jumlah, 0);
  }, [stockEntries]);

  // Current stock remaining in warehouse
  const sisaStokGudang = useMemo(() => {
    return totalStockMasuk - totalStockKeluar;
  }, [totalStockMasuk, totalStockKeluar]);

  // Is stock below alert threshold?
  const isStockCritical = sisaStokGudang < minStockAlert;

  // Filtered entries for the table display
  const filteredEntries = useMemo(() => {
    return stockEntries.filter(entry => {
      // Exclude sales-specific entries from the warehouse ledger
      if (entry.hanyaSales) return false;

      // 1. Search term (by Source or Description)
      const matchesSearch = 
        entry.sumberTujuan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.keterangan.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Filter Type (Masuk / Keluar / Semua)
      const matchesType = filterType === 'Semua' || entry.tipe === filterType;

      // 3. Filter Source (Aplikasi / Spreadsheet / Semua)
      const matchesSource = filterSource === 'Semua' || entry.sumberInput === filterSource;

      return matchesSearch && matchesType && matchesSource;
    });
  }, [stockEntries, searchTerm, filterType, filterSource]);

  // Daily stock levels cumulative chart data
  const chartStockTrendData = useMemo(() => {
    // Sort chronological oldest-to-newest for cumulative sum
    const chronological = [...stockEntries].sort((a, b) => {
      const dateA = a.tanggal instanceof Date ? a.tanggal : new Date(a.tanggal);
      const dateB = b.tanggal instanceof Date ? b.tanggal : new Date(b.tanggal);
      return dateA.getTime() - dateB.getTime();
    });
    
    let currentSum = 0;
    const dailyPoints: Record<string, number> = {};

    chronological.forEach(entry => {
      if (entry.hanyaSales || entry.isReversed) return;
      const entryDate = entry.tanggal instanceof Date ? entry.tanggal : new Date(entry.tanggal);
      const dateStr = entryDate.toISOString().substring(0, 10);
      const diff = entry.tipe === 'Masuk' ? entry.jumlah : -entry.jumlah;
      currentSum += diff;
      dailyPoints[dateStr] = currentSum;
    });

    // Format for Recharts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return Object.entries(dailyPoints).map(([dateStr, stockVal]) => {
      const d = new Date(dateStr);
      return {
        dateStr,
        displayDate: `${d.getDate()} ${months[d.getMonth()]}`,
        'Stok Gudang': stockVal,
        'Batas Aman': minStockAlert
      };
    }).slice(-15); // Show last 15 days for a clean trend view
  }, [stockEntries, minStockAlert]);

  // Outlet distribution data for outflows
  const outletOutflowData = useMemo(() => {
    const map: Record<string, number> = {};
    stockEntries
      .filter(e => e.tipe === 'Keluar' && !e.isReversed && !e.hanyaSales)
      .forEach(e => {
        map[e.sumberTujuan] = (map[e.sumberTujuan] || 0) + e.jumlah;
      });

    return Object.entries(map)
      .map(([name, val]) => ({ name, 'Total Keluar (Pack)': val }))
      .sort((a, b) => b['Total Keluar (Pack)'] - a['Total Keluar (Pack)'])
      .slice(0, 6); // Top 6 targets
  }, [stockEntries]);

  return (
    <div id="stok_gudang_view" className="space-y-6">
      
      {/* 1. Header Hero Box */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white border border-indigo-950 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 bg-indigo-500/30 text-indigo-300 font-extrabold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase border border-indigo-500/40">
              <Package className="w-3.5 h-3.5 animate-bounce" />
              Sistem Manajemen Pergudangan (WMS)
            </span>
            <h3 className="text-xl font-black tracking-tight text-white">Stok & Logistik Gudang Makayasa</h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Pantau sirkulasi barang masuk dari pabrik utama serta penyaluran barang keluar ke masing-masing sales secara presisi. Mendukung input ganda lewat aplikasi langsung maupun sinkronisasi instan spreadsheet/excel.
            </p>
          </div>
          
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleClearAllStock}
              title="Hapus dan kosongkan seluruh pencatatan stok"
              className="p-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white rounded-2xl border border-rose-500/30 transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="w-4 h-4" /> Kosongkan Data
            </button>
            <button
              onClick={handleResetInventory}
              title="Reset ke database simulasi bawaan"
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700/80 transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" /> Reset Simulasi
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Stock Dashboard KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1: Remaining Stock in Warehouse */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className={`p-4 rounded-2xl ${isStockCritical ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Sisa Stok Gudang</span>
            <h3 className={`text-3xl font-black font-mono tracking-tight ${isStockCritical ? 'text-rose-600' : 'text-slate-900'}`}>
              {sisaStokGudang.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-400 font-sans">Pack</span>
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-bold font-mono">
                = {Number((sisaStokGudang / 10).toFixed(1))} Selop
              </span>
              {isStockCritical ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md uppercase">
                  ⚠️ Limit kritis!
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase">
                  ✓ Stok Aman
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: Total Incoming Stock */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600">
            <ArrowDownLeft className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total Stok Masuk (Pabrik)</span>
            <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {totalStockMasuk.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-400 font-sans">Pack</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold">
              Terhitung dari {stockEntries.filter(e => e.tipe === 'Masuk').length} kali restock pabrik
            </p>
          </div>
        </div>

        {/* KPI 3: Total Outflow Stock */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-600">
            <ArrowUpRight className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Total Stok Keluar (Sales)</span>
            <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {totalStockKeluar.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-400 font-sans">Pack</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold">
              Telah disalurkan ke sales untuk penjualan pasar
            </p>
          </div>
        </div>

      </div>

      {/* 3. Input Dual optional panel (Aplikasi / Spreadsheet) & Recharts Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel Input (Left) */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          
          {/* Header Switch Tabs */}
          <div>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" /> Pencatatan Stok
              </h4>
              <div className="flex bg-slate-200/75 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFormTab('app')}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeFormTab === 'app' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600'}`}
                >
                  📱 App
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab('spreadsheet')}
                  className={`px-2.5 py-1 rounded-md transition-all ${activeFormTab === 'spreadsheet' ? 'bg-white text-indigo-900 shadow-sm' : 'text-slate-600'}`}
                >
                  🟢 Sheet / Copy
                </button>
              </div>
            </div>

            {/* Tab 1: Aplikasi form */}
            {activeFormTab === 'app' ? (
              <form onSubmit={handleAddAppStock} className="p-5 space-y-4">
                {isFormSubmitted && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    Pencatatan stok berhasil disimpan ke database lokal!
                  </motion.div>
                )}

                {/* Form Type selector */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Jenis Transaksi Stok:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormType('Masuk')}
                      className={`py-1.5 rounded-lg text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-all ${
                        formType === 'Masuk' 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Stok Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('Keluar')}
                      className={`py-1.5 rounded-lg text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-all ${
                        formType === 'Keluar' 
                          ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <MinusCircle className="w-3.5 h-3.5" /> Stok Keluar
                    </button>
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Tanggal Pencatatan:</label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Source / Destination */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Pilihan Sumber / Tujuan Stok:
                  </label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <optgroup label="1. Pabrik">
                      <option value="Pabrik Makayasa">Pabrik Makayasa</option>
                    </optgroup>
                    <optgroup label="2. Sales">
                      {activeSales.map(sales => (
                        <option key={sales} value={`Sales ${sales}`}>Sales {sales}</option>
                      ))}
                      <option value="Sales Umum">Sales Umum</option>
                    </optgroup>
                    <optgroup label="3. Retur">
                      <option value="Retur Pasar">Retur Pasar</option>
                      <option value="Retur Cacat">Retur Cacat / Rusak</option>
                    </optgroup>
                  </select>
                </div>

                {/* Quantity (Packs) */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-extrabold text-slate-700">Jumlah Volume (Pack):</label>
                    {formQty && (
                      <span className="font-bold text-slate-400 text-[10px]">
                        = {Number((parseInt(formQty, 10) / 10).toFixed(1))} Selop
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 150"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 block">Keterangan Tambahan:</label>
                  <textarea
                    rows={2}
                    placeholder="Ketik keterangan (misal: pengiriman truk no.9)"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                >
                  <ClipboardCheck className="w-4 h-4" /> Simpan Pencatatan Stok
                </button>
              </form>
            ) : (
              // Tab 2: Spreadsheet pasting / GID sync
              <div className="p-5 space-y-4">
                {pasteError && (
                  <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{pasteError}</span>
                  </div>
                )}
                {pasteSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{pasteSuccess}</span>
                  </div>
                )}

                {/* Copy paste method */}
                <form onSubmit={handlePasteImport} className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-700 block flex items-center gap-1">
                    <Import className="w-4 h-4 text-emerald-600" /> Tempel Data Spreadsheet:
                  </label>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Copy baris data dari Excel/Google Sheets Anda (Kolom wajib: <strong>Tanggal, Tipe (Masuk/Keluar), Jumlah</strong>), lalu paste di bawah:
                  </p>
                  <textarea
                    rows={4}
                    value={pastedData}
                    onChange={(e) => setPastedData(e.target.value)}
                    placeholder="26/06/2026&#9;Masuk&#9;1500&#9;Pabrik&#9;Sewa reguler&#10;25/06/2026&#9;Keluar&#9;250&#9;Sales Rico&#9;Ambil sales"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none placeholder-slate-300"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-600/10"
                  >
                    ✓ Import Baris Tempel
                  </button>
                </form>

                {/* GID / Link sync method */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <label className="text-xs font-extrabold text-slate-700 block flex items-center gap-1">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Tarik URL GID Khusus Stok:
                  </label>
                  <input
                    type="text"
                    value={stockSheetUrl}
                    onChange={(e) => setStockSheetUrl(e.target.value)}
                    placeholder="Masukkan URL Google Sheets Stok..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-medium focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold block uppercase">Sheet GID:</label>
                      <input
                        type="text"
                        value={stockSheetGid}
                        onChange={(e) => setStockSheetGid(e.target.value)}
                        placeholder="GID (biasanya 0)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleUrlSync}
                        disabled={isSyncingUrl}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {isSyncingUrl ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sinkron...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" /> Sinkron URL
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Configurable alarm limit (Bottom) */}
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-slate-700">Set Kritis Alert Gudang:</span>
              <span className="font-black text-rose-600 font-mono">{minStockAlert} Pack</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={minStockAlert}
              onChange={(e) => handleUpdateMinStock(parseInt(e.target.value, 10))}
              className="w-full accent-rose-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer mt-1.5"
            />
          </div>

        </div>

        {/* Visual Charts (Right, spans 2 columns) */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-6">
          
          {/* Chart 1: Stock Level Trend */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>Trend Saldo / Volume Stok Gudang</span>
              </h4>
              <p className="text-xs text-slate-500">Melihat sisa stok kumulatif harian di dalam gudang dalam 15 hari terakhir</p>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartStockTrendData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="Stok Gudang" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStock)" />
                  <Area type="monotone" dataKey="Batas Aman" stroke="#f43f5e" strokeWidth={1} strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Top Outflow Destinations */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>Penyaluran Stok Terbesar</span>
              </h4>
              <p className="text-xs text-slate-500">Distribusi pengeluaran stok berdasarkan sales / target alokasi terbesar</p>
            </div>
            
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={outletOutflowData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="Total Keluar (Pack)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

      {/* 4. Table view of stock entries */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Table Filters header */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 text-slate-700 p-2 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Arsip Pencatatan Sirkulasi Stok</h4>
              <p className="text-xs text-slate-500">Total {filteredEntries.length} pencatatan terfilter</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari sumber/keterangan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs w-44 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
            >
              <option value="Semua">Semua Tipe</option>
              <option value="Masuk">Tipe Masuk</option>
              <option value="Keluar">Tipe Keluar</option>
            </select>

            {/* Source input filter */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
            >
              <option value="Semua">Semua Sumber Input</option>
              <option value="Aplikasi">Input Aplikasi</option>
              <option value="Spreadsheet">Input Spreadsheet</option>
            </select>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                <th className="p-4">ID Transaksi</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4 text-center">Tipe</th>
                <th className="p-4">Sumber / Tujuan</th>
                <th className="p-4 text-right">Jumlah (Pack)</th>
                <th className="p-4 text-right">Ekuivalen Selop</th>
                <th className="p-4">Sumber Input</th>
                <th className="p-4">Keterangan</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                    <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada pencatatan stok yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const isReversed = !!entry.isReversed;
                  return (
                    <tr 
                      key={entry.id} 
                      className={`transition-colors ${
                        isReversed 
                          ? "bg-slate-50/40 text-slate-400 line-through opacity-60 hover:bg-slate-50/40 select-none" 
                          : "hover:bg-slate-50/50"
                      }`}
                    >
                      <td className="p-4 font-mono text-[10px] text-slate-400">
                        {entry.id}
                      </td>
                      <td className="p-4 text-slate-900 font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {(entry.tanggal instanceof Date ? entry.tanggal : new Date(entry.tanggal)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-center">
                        {isReversed ? (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded border border-slate-200">
                            ✕ Batal
                          </span>
                        ) : entry.tipe === 'Masuk' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-100">
                            ▲ Masuk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-100">
                            ▼ Keluar
                          </span>
                        )}
                      </td>
                      <td className={`p-4 font-bold ${isReversed ? 'text-slate-400' : 'text-slate-950'}`}>
                        {entry.sumberTujuan}
                      </td>
                      <td className={`p-4 text-right font-mono font-black ${
                        isReversed 
                          ? 'text-slate-400' 
                          : entry.tipe === 'Masuk' 
                            ? 'text-emerald-600' 
                            : 'text-slate-800'
                      }`}>
                        {entry.tipe === 'Masuk' ? '+' : '-'}{entry.jumlah.toLocaleString('id-ID')} Pack
                      </td>
                      <td className="p-4 text-right font-mono text-slate-500 font-bold">
                        {Number((entry.jumlah / 10).toFixed(1))} Selop
                      </td>
                      <td className="p-4">
                        {isReversed ? (
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                            🚫 Cancelled
                          </span>
                        ) : entry.sumberInput === 'Aplikasi' ? (
                          <span className="bg-indigo-50 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                            📱 Aplikasi
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                            🟢 Spreadsheet
                          </span>
                        )}
                      </td>
                      <td className={`p-4 max-w-xs truncate text-[11px] ${isReversed ? 'text-slate-400 italic' : 'text-slate-500'}`} title={entry.keterangan}>
                        {entry.keterangan} {isReversed && "(Dibatalkan oleh sistem)"}
                      </td>
                      <td className="p-4 text-center">
                        {isReversed ? (
                          <span className="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                            Batal
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title={entry.sumberInput === 'Aplikasi' ? "Hapus pencatatan manual" : "Batalkan/Reverse pencatatan spreadsheet"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Custom Confirmation / Alert Dialog Modal */}
      <AnimatePresence>
        {modalState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl shrink-0 ${modalState.type === 'alert' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                  {modalState.type === 'alert' ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : (
                    <Trash2 className="w-6 h-6" />
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-base font-black text-slate-950 tracking-tight">
                    {modalState.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {modalState.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                {modalState.type === 'confirm' && (
                  <button
                    type="button"
                    onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="button"
                  onClick={modalState.onConfirm}
                  className={`px-4 py-2 rounded-xl font-bold text-xs text-white transition-all shadow-sm ${
                    modalState.type === 'alert' 
                      ? 'bg-amber-500 hover:bg-amber-600' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {modalState.type === 'alert' ? 'OK' : 'Yakin'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
