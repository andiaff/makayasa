/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  TrendingUp, 
  User, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowDownRight, 
  ArrowUpRight, 
  Search, 
  Calendar, 
  History, 
  Truck, 
  Sparkles, 
  Trash2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { Transaction, StockEntry } from '../types';

interface StokSalesProps {
  transactions: Transaction[]; // Already filtered by global FilterBar
  salesNames: string[];
  loggedInSalesName?: string | null;
}

const STORAGE_STOCK_KEY = 'makayasa_stok_gudang';

export default function StokSales({ transactions, salesNames, loggedInSalesName }: StokSalesProps) {
  // --- STATE ---
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [viewMode, setViewMode] = useState<'filtered' | 'cumulative'>('cumulative');
  const [selectedSales, setSelectedSales] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Quick allocation form state
  const [isAllocationOpen, setIsAllocationOpen] = useState<boolean>(false);
  const [allocSales, setAllocSales] = useState<string>('');
  const [allocQty, setAllocQty] = useState<string>('');
  const [allocDate, setAllocDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [allocDesc, setAllocDesc] = useState<string>('');
  const [allocReduceGudang, setAllocReduceGudang] = useState<boolean>(true); // Default true
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);

  // Custom alert dialog state
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

  // --- LOAD STOCK ENTRIES FROM LOCAL STORAGE ---
  const loadStockEntries = () => {
    const savedEntries = localStorage.getItem(STORAGE_STOCK_KEY);
    if (savedEntries) {
      try {
        const parsed = JSON.parse(savedEntries) as any[];
        const hydrated = parsed.map(entry => ({
          ...entry,
          tanggal: new Date(entry.tanggal)
        }));
        setStockEntries(hydrated);
      } catch (e) {
        console.error('Failed to load stock entries in StokSales:', e);
      }
    }
  };

  useEffect(() => {
    loadStockEntries();
    // Set default sales for allocation dropdown
    if (salesNames && salesNames.length > 0) {
      setAllocSales(salesNames[0]);
    }
  }, [salesNames]);

  // Handle outside changes or storage updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_STOCK_KEY) {
        loadStockEntries();
      }
    };
    const handleSyncUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.key === STORAGE_STOCK_KEY) {
        loadStockEntries();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('makayasa_sync_update', handleSyncUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('makayasa_sync_update', handleSyncUpdate);
    };
  }, []);

  // Sync / save updated stock entries
  const saveEntries = (entries: StockEntry[]) => {
    setStockEntries(entries);
    localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify(entries));
    // Dispatch storage event manually for same-window syncing
    window.dispatchEvent(new Event('storage'));
  };

  // --- DATA CALCULATIONS ---
  
  // Group metrics per sales
  const salesMetrics = useMemo(() => {
    return salesNames.map(name => {
      // 1. Calculate Stok Masuk to this sales (warehouse stock out to this sales OR direct adjustments)
      const allocations = stockEntries.filter(entry => {
        const isWarehouseOutToSales = entry.tipe === 'Keluar' && !entry.hanyaSales;
        const isDirectSalesStock = entry.hanyaSales === true;
        
        if (!isWarehouseOutToSales && !isDirectSalesStock) return false;
        
        const dest = entry.sumberTujuan.toLowerCase().trim();
        const sName = name.toLowerCase().trim();
        
        // Date filtration if viewMode is 'filtered'
        if (viewMode === 'filtered') {
          // Check if this stock entry date is in the filtered transactions timeframe
          if (transactions.length > 0) {
            const txDates = transactions.map(t => new Date(t.tanggal).getTime());
            const minTime = Math.min(...txDates);
            const maxTime = Math.max(...txDates);
            const entryTime = new Date(entry.tanggal).getTime();
            if (entryTime < minTime || entryTime > maxTime) {
              return false;
            }
          } else {
            // No transactions matches, default to current day
            const todayStr = new Date().toISOString().substring(0, 10);
            const entryStr = new Date(entry.tanggal).toISOString().substring(0, 10);
            if (todayStr !== entryStr) return false;
          }
        }

        const matchesSalesName = dest === sName || 
                                 dest === `sales ${sName}` || 
                                 dest === `penyesuaian ${sName}` || 
                                 (entry.salesName && entry.salesName.toLowerCase().trim() === sName);

        return matchesSalesName;
      });

      const totalMasuk = allocations.reduce((sum, entry) => sum + entry.jumlah, 0);

      // 2. Calculate Stok Keluar from sales (sales transactions to stores)
      // This is automatically aggregated from transactions
      const salesTx = transactions.filter(tx => {
        return (tx.salesName || '').toLowerCase().trim() === name.toLowerCase().trim();
      });

      const totalKeluar = salesTx.reduce((sum, tx) => sum + tx.qtyPacks, 0);

      // 3. Calculate Sisa Stok = Stok Masuk - Stok Keluar
      const sisaStok = totalMasuk - totalKeluar;

      // Calculate status & alert level
      let status: 'aman' | 'menipis' | 'kritis' = 'aman';
      if (sisaStok <= 15) {
        status = 'kritis';
      } else if (sisaStok <= 40) {
        status = 'menipis';
      }

      // Calculate progress percentage of stock sold
      const percentSold = totalMasuk > 0 ? Math.round((totalKeluar / totalMasuk) * 100) : 0;

      return {
        name,
        totalMasuk,
        totalKeluar,
        sisaStok,
        status,
        percentSold,
        allocationsCount: allocations.length,
        salesCount: salesTx.length
      };
    });
  }, [salesNames, stockEntries, transactions, viewMode]);

  // Overall Global Summary
  const globalSummary = useMemo(() => {
    const totalMasuk = salesMetrics.reduce((sum, m) => sum + m.totalMasuk, 0);
    const totalKeluar = salesMetrics.reduce((sum, m) => sum + m.totalKeluar, 0);
    const sisaStok = totalMasuk - totalKeluar;
    const criticalSalesCount = salesMetrics.filter(m => m.sisaStok <= 30).length;

    return {
      totalMasuk,
      totalKeluar,
      sisaStok,
      criticalSalesCount
    };
  }, [salesMetrics]);

  // Filtered sales metrics list based on search term
  const filteredSalesMetrics = useMemo(() => {
    if (!searchTerm.trim()) return salesMetrics;
    return salesMetrics.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [salesMetrics, searchTerm]);

  // --- INDIVIDUAL SALES DETAIL VIEW LOGS ---
  const selectedSalesLogs = useMemo(() => {
    if (!selectedSales) return [];

    const logs: {
      id: string;
      tanggal: Date;
      tipe: 'Masuk' | 'Keluar'; // Masuk = warehouse allocated stock to sales, Keluar = sales sold to store
      sumberTujuan: string;
      jumlah: number;
      keterangan: string;
      reference?: string; // transaction id or stock entry id
      canDelete?: boolean;
      hanyaSales?: boolean;
    }[] = [];

    // 1. Add Warehouse allocations (Inflow to Sales)
    stockEntries.forEach(entry => {
      const isWarehouseOutToSales = entry.tipe === 'Keluar' && !entry.hanyaSales;
      const isDirectSalesStock = entry.hanyaSales === true;

      if (isWarehouseOutToSales || isDirectSalesStock) {
        const dest = entry.sumberTujuan.toLowerCase().trim();
        const sName = selectedSales.toLowerCase().trim();
        
        const matchesSalesName = dest === sName || 
                                 dest === `sales ${sName}` || 
                                 dest === `penyesuaian ${sName}` || 
                                 (entry.salesName && entry.salesName.toLowerCase().trim() === sName);

        if (matchesSalesName) {
          logs.push({
            id: entry.id,
            tanggal: new Date(entry.tanggal),
            tipe: 'Masuk', // It's "Masuk" from perspective of the Sales stock
            sumberTujuan: entry.hanyaSales ? 'Penyesuaian (Murni Sales)' : 'Gudang Makayasa Utama',
            jumlah: entry.jumlah,
            keterangan: entry.keterangan || (entry.hanyaSales ? 'Input manual penyesuaian stok sales' : 'Distribusi stok dari gudang utama'),
            reference: entry.id,
            canDelete: entry.sumberInput === 'Aplikasi',
            hanyaSales: entry.hanyaSales
          });
        }
      }
    });

    // 2. Add sales transactions to stores (Outflow from Sales)
    transactions.forEach(tx => {
      if ((tx.salesName || '').toLowerCase().trim() === selectedSales.toLowerCase().trim()) {
        logs.push({
          id: tx.id,
          tanggal: new Date(tx.tanggal),
          tipe: 'Keluar', // Sales sold to store
          sumberTujuan: tx.storeName,
          jumlah: tx.qtyPacks,
          keterangan: `Penjualan toko: ${tx.storeName} (${tx.statusKunjungan})`,
          reference: tx.id
        });
      }
    });

    // Sort by Date descending
    return logs.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());
  }, [selectedSales, stockEntries, transactions]);

  // --- DELETE / REVERT ALLOCATION ---
  const handleDeleteAllocation = (entryId: string) => {
    setModalState({
      isOpen: true,
      title: 'Batalkan & Hapus Alokasi?',
      message: 'Apakah Anda yakin ingin membatalkan/menghapus pencatatan alokasi ini? Stok bawaan sales akan berkurang kembali, dan jika alokasi ini sebelumnya memotong stok Gudang Utama, maka sisa stok Gudang Utama akan otomatis dikembalikan.',
      type: 'confirm',
      onConfirm: () => {
        const updated = stockEntries.filter(e => e.id !== entryId);
        saveEntries(updated);
        setModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // --- ALLOCATION FORM SUBMISSION ---
  const handleAllocateStock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(allocQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setModalState({
        isOpen: true,
        title: 'Jumlah Tidak Valid',
        message: 'Silakan isi jumlah volume pack dengan angka positif!',
        type: 'alert',
        onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (!allocSales) {
      setModalState({
        isOpen: true,
        title: 'Sales Belum Dipilih',
        message: 'Silakan pilih sales penerima distribusi stok!',
        type: 'alert',
        onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const isHanyaSales = !allocReduceGudang;

    const newWarehouseOutEntry: StockEntry = {
      id: `STK-APP-${Date.now()}`,
      tanggal: new Date(allocDate),
      tipe: 'Keluar', // Outflow from warehouse view
      sumberTujuan: isHanyaSales ? `Penyesuaian ${allocSales}` : `Sales ${allocSales}`,
      jumlah: qty,
      keterangan: allocDesc.trim() || (isHanyaSales 
        ? `Penyesuaian stok awal/mandiri Sales ${allocSales} (tanpa potong Gudang)` 
        : `Pemberian/Drop stok gudang ke Sales ${allocSales}`),
      sumberInput: 'Aplikasi',
      hanyaSales: isHanyaSales,
      salesName: allocSales
    };

    const updated = [newWarehouseOutEntry, ...stockEntries];
    saveEntries(updated);

    // Reset Form
    setAllocQty('');
    setAllocDesc('');
    setIsAllocationOpen(false);
    setIsFormSubmitted(true);
    setTimeout(() => setIsFormSubmitted(false), 3000);

    setModalState({
      isOpen: true,
      title: isHanyaSales ? 'Penyesuaian Berhasil!' : 'Distribusi Berhasil!',
      message: isHanyaSales
        ? `Stok penyesuaian sebanyak ${qty} Pack berhasil dicatat untuk Sales ${allocSales} secara mandiri tanpa memotong sisa stok Gudang Utama.`
        : `Stok sebanyak ${qty} Pack berhasil disalurkan ke Sales ${allocSales}. Sisa stok gudang utama berkurang, dan sisa stok sales bertambah secara otomatis.`,
      type: 'alert',
      onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
    });
  };

  // Helper format currency IDR
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Recharts color palette
  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6'];

  return (
    <div className="space-y-6">
      
      {/* Dynamic Navigation Indicator Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500 text-slate-950">
              <Package className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Logistik & Alokasi Stok Sales</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pantau ketersediaan barang bawaan per sales secara otomatis, disinkronisasikan langsung dengan mutasi keluar Gudang Utama & transaksi penjualan toko.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                viewMode === 'cumulative' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Waktu
            </button>
            <button
              onClick={() => setViewMode('filtered')}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                viewMode === 'filtered' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sesuai Filter
            </button>
          </div>

          {!loggedInSalesName && (
            <button
              onClick={() => setIsAllocationOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/10 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" /> Bagi Stok Sales
            </button>
          )}
        </div>
      </div>

      {/* Global Sales Stock Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Stock Allocated to Sales */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Drop dari Gudang</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">{globalSummary.totalMasuk} <span className="text-xs text-slate-400">Pack</span></h4>
            <p className="text-[10px] text-indigo-500 font-bold">Stok yang dipegang sales</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Total Sold by Sales to Shops */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Terjual di Toko</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">{globalSummary.totalKeluar} <span className="text-xs text-slate-400">Pack</span></h4>
            <p className="text-[10px] text-emerald-600 font-bold">Berhasil terjual ke pasar</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Remaining Sales Hand Stock */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Sisa Stok Sales</p>
            <h4 className="text-2xl font-black text-indigo-600 tracking-tight">{globalSummary.sisaStok} <span className="text-xs text-slate-400">Pack</span></h4>
            <p className="text-[10px] text-slate-500 font-bold">Sisa di tangan semua sales</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Warning Indicator */}
        <div className={`border rounded-3xl p-6 shadow-sm flex items-center justify-between ${
          globalSummary.criticalSalesCount > 0 
            ? 'bg-rose-50 border-rose-100 text-rose-800' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-800'
        }`}>
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider">Status Stok Lapangan</p>
            <h4 className="text-lg font-black tracking-tight">
              {globalSummary.criticalSalesCount > 0 
                ? `${globalSummary.criticalSalesCount} Sales Tipis` 
                : 'Semua Sales Aman'}
            </h4>
            <p className="text-[10px] opacity-80">
              {globalSummary.criticalSalesCount > 0 
                ? 'Butuh restock/kiriman dari gudang' 
                : 'Stok di sales memadai'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            globalSummary.criticalSalesCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
            {globalSummary.criticalSalesCount > 0 ? <AlertTriangle className="w-6 h-6 animate-bounce" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
        </div>

      </div>

      {/* Main Analysis Chart & Allocation Form Collapsible */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts comparison of stock */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900">Perbandingan Stok per Sales</h4>
            <p className="text-xs text-slate-400 mb-6">Grafik alokasi masuk vs realisasi penjualan masing-masing sales (dalam satuan Pack)</p>
            
            <div className="h-72 w-full">
              {salesMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesMetrics} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} fontWeight={700} />
                    <YAxis stroke="#94A3B8" fontSize={11} fontWeight={700} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '16px', border: 'none', color: '#fff' }}
                      itemStyle={{ fontSize: '11px' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#F59E0B', marginBottom: '4px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '10px' }} />
                    <Bar name="Stok Masuk (Allocation)" dataKey="totalMasuk" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    <Bar name="Stok Keluar (Terjual)" dataKey="totalKeluar" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar name="Sisa Stok" dataKey="sisaStok" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                  <Package className="w-12 h-12 mb-2" />
                  <p className="text-xs font-bold">Tidak ada data untuk dibandingkan</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Distribution overview list pie chart */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900">Proporsi Kepemilikan Sisa Stok</h4>
            <p className="text-xs text-slate-400 mb-6">Distribusi sisa barang rokok Makayasa di lapangan saat ini</p>
            
            <div className="h-52 w-full flex items-center justify-center">
              {globalSummary.sisaStok > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesMetrics.filter(m => m.sisaStok > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="sisaStok"
                    >
                      {salesMetrics.filter(m => m.sisaStok > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${value} Pack`, 'Sisa Stok']}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-300">
                  <AlertCircle className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-[10px] font-bold">Seluruh stok sales kosong</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] max-h-20 overflow-y-auto">
              {salesMetrics.map((m, idx) => (
                <div key={m.name} className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-600 truncate">{m.name}:</span>
                  <span className="text-slate-900 font-mono font-black">{m.sisaStok} Pack</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Main Inventory Status Table & Real-time Live Sync Check */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Table List of Sales Stock */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-slate-950">Daftar Stok Lapangan Per Sales Person</h4>
              <p className="text-xs text-slate-400">Sisa stok otomatis terhitung = [Stok Masuk dari Gudang] - [Penjualan Toko]</p>
            </div>
            
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Cari sales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-full md:w-56 bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs font-semibold transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100/80 w-full">
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3.5 px-4">Sales Person</th>
                  <th className="py-3.5 px-4 text-center">Stok Masuk (Gudang)</th>
                  <th className="py-3.5 px-4 text-center">Stok Keluar (Terjual)</th>
                  <th className="py-3.5 px-4 text-center">Sisa Stok</th>
                  <th className="py-3.5 px-4 text-center">Kadar Terjual</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSalesMetrics.length > 0 ? (
                  filteredSalesMetrics.map((sales) => (
                    <tr 
                      key={sales.name} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        selectedSales === sales.name ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block">Sales {sales.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{sales.salesCount} invoice penjualan</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Allocated from warehouse */}
                      <td className="py-3 px-4 text-center font-mono font-extrabold text-xs text-slate-700">
                        {sales.totalMasuk} Pack
                        <span className="block text-[9px] text-slate-400 font-semibold">{sales.allocationsCount}x drop</span>
                      </td>

                      {/* Sold to customers */}
                      <td className="py-3 px-4 text-center font-mono font-extrabold text-xs text-emerald-600">
                        {sales.totalKeluar} Pack
                      </td>

                      {/* Remaining stock */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-mono font-black text-xs px-2.5 py-0.5 rounded-full ${
                            sales.sisaStok <= 15 
                              ? 'bg-rose-50 text-rose-600 font-black border border-rose-100' 
                              : sales.sisaStok <= 40 
                              ? 'bg-amber-50 text-amber-600 font-black border border-amber-100' 
                              : 'bg-emerald-50 text-emerald-600 font-black border border-emerald-100'
                          }`}>
                            {sales.sisaStok} Pack
                          </span>
                        </div>
                      </td>

                      {/* Progress Bar of Sold % */}
                      <td className="py-3 px-4">
                        <div className="w-24 mx-auto space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-black text-slate-500 font-mono">
                            <span>{sales.percentSold}%</span>
                            <span>sold</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                sales.percentSold > 80 
                                  ? 'bg-emerald-500' 
                                  : sales.percentSold > 50 
                                  ? 'bg-indigo-500' 
                                  : 'bg-amber-500'
                              }`} 
                              style={{ width: `${Math.min(sales.percentSold, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Detail button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSales(selectedSales === sales.name ? null : sales.name)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-black tracking-tight transition-all ${
                            selectedSales === sales.name 
                              ? 'bg-indigo-600 text-white shadow-sm' 
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {selectedSales === sales.name ? 'Tutup Detail' : 'Histori Stok'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 text-xs font-bold">
                      Tidak menemukan sales dengan kriteria tersebut.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Explanatory widget & Quick allocation form */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
          <div className="space-y-1.5">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" /> Bagaimana Cara Kerjanya?
            </h4>
            <div className="text-[11px] text-slate-500 leading-relaxed space-y-2.5 font-medium bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/30">
              <p>
                🔄 <strong>Otomasi Mutasi</strong>: Menu ini tidak memerlukan input manual ganda. Sisa stok dihitung secara dinamis dari aktivitas nyata.
              </p>
              <p>
                📦 <strong>Stok Masuk (+):</strong> Ditambah otomatis ketika Anda mencatat <strong>Stok Keluar</strong> di menu <strong>Stok Gudang</strong> dengan tujuan Sales yang bersangkutan.
              </p>
              <p>
                📉 <strong>Stok Keluar (-):</strong> Dikurangi otomatis berdasarkan jumlah <strong>Pack Terjual</strong> yang diinput sales di menu <strong>Penjualan Sales</strong>.
              </p>
            </div>
          </div>

          {!loggedInSalesName && (
            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] font-bold text-slate-700 mb-2">Ingin menambah stok untuk sales?</p>
              <button
                onClick={() => {
                  if (salesNames.length > 0) setAllocSales(salesNames[0]);
                  setIsAllocationOpen(true);
                }}
                className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 rounded-xl text-xs font-black transition-colors"
              >
                + Buat Pengiriman Baru ke Sales
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Slide-Down / Detailed view log of selected Sales */}
      <AnimatePresence>
        {selectedSales && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Histori Mutasi & Jurnal Stok Sales: <span className="text-indigo-600">{selectedSales}</span>
                  </h4>
                  <p className="text-xs text-slate-400">Jurnal rincian barang masuk dari gudang & barang keluar via penjualan</p>
                </div>
                <button
                  onClick={() => setSelectedSales(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Tutup [X]
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100/80 w-full">
                <table className="w-full min-w-[800px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                      <th className="py-2.5 px-4">Tanggal</th>
                      <th className="py-2.5 px-4">Jenis Transaksi</th>
                      <th className="py-2.5 px-4">Sumber / Toko Tujuan</th>
                      <th className="py-2.5 px-4 text-center">Volume (Packs)</th>
                      <th className="py-2.5 px-4">Keterangan / Status</th>
                      <th className="py-2.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSalesLogs.length > 0 ? (
                      selectedSalesLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-500">
                            {log.tanggal.toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              log.tipe === 'Masuk' 
                                ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                                : 'bg-rose-50 border-rose-100 text-rose-700'
                            }`}>
                              {log.tipe === 'Masuk' ? (
                                <>
                                  <ArrowUpRight className="w-3 h-3 text-indigo-500 shrink-0" />
                                  Stok Masuk (Allocation)
                                </>
                              ) : (
                                <>
                                  <ArrowDownRight className="w-3 h-3 text-rose-500 shrink-0" />
                                  Stok Keluar (Terjual)
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-black text-slate-800">
                            {log.sumberTujuan}
                          </td>
                          <td className={`py-2.5 px-4 text-center font-mono font-black ${
                            log.tipe === 'Masuk' ? 'text-indigo-600' : 'text-slate-700'
                          }`}>
                            {log.tipe === 'Masuk' ? `+${log.jumlah}` : `-${log.jumlah}`} Pack
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-medium">
                            {log.keterangan}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {log.canDelete && !loggedInSalesName ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteAllocation(log.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Batalkan & hapus alokasi ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-300 italic font-semibold">Auto</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                          Belum ada histori alokasi atau penjualan tercatat untuk sales ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Allocation Dialog Modal */}
      <AnimatePresence>
        {isAllocationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Truck className="w-5 h-5" />
                  </span>
                  <h4 className="text-base font-black text-slate-950 tracking-tight">
                    Drop / Kirim Stok ke Sales
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAllocationOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  [X]
                </button>
              </div>

              <form onSubmit={handleAllocateStock} className="space-y-4 text-left">
                {/* Sales list drop down */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Pilih Sales Penerima:</label>
                  <select
                    value={allocSales}
                    onChange={(e) => setAllocSales(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {salesNames.map(name => (
                      <option key={name} value={name}>Sales {name}</option>
                    ))}
                  </select>
                </div>

                {/* Allocated qty */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Jumlah Drop (Pack):</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 100"
                    value={allocQty}
                    onChange={(e) => setAllocQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Allocated date */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Tanggal Transaksi:</label>
                  <input
                    type="date"
                    required
                    value={allocDate}
                    onChange={(e) => setAllocDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Reduce warehouse stock toggle */}
                <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl p-3 select-none">
                  <input
                    type="checkbox"
                    id="allocReduceGudang"
                    checked={allocReduceGudang}
                    onChange={(e) => setAllocReduceGudang(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 accent-indigo-600 cursor-pointer shrink-0"
                  />
                  <div className="flex-1">
                    <label htmlFor="allocReduceGudang" className="text-xs font-black text-slate-700 cursor-pointer block leading-tight">
                      Kurangi Stok Gudang Utama
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold block leading-tight mt-0.5">
                      {allocReduceGudang 
                        ? "Mengurangi sisa stok di Gudang Utama secara otomatis." 
                        : "Hanya menambah stok sales (misal: untuk stok awal/titipan yang sudah ada)."}
                    </span>
                  </div>
                </div>

                {/* Optional description */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">Keterangan / Catatan:</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Alokasi drop stok awal minggu atau Ambil di gudang"
                    value={allocDesc}
                    onChange={(e) => setAllocDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAllocationOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
                  >
                    Kirim Stok
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation / Alert Dialog Modal */}
      <AnimatePresence>
        {modalState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3.5 text-left">
                <div className={`p-2.5 rounded-2xl shrink-0 ${
                  modalState.type === 'alert' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  {modalState.type === 'alert' ? (
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-950 leading-tight">
                    {modalState.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                    {modalState.message}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2.5">
                {modalState.type === 'confirm' && (
                  <button
                    type="button"
                    onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="button"
                  onClick={modalState.onConfirm}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs text-white transition-all shadow-sm ${
                    modalState.type === 'alert' 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {modalState.type === 'alert' ? 'OK' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
