/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Plus, 
  Search, 
  Download, 
  Filter, 
  Trash2, 
  Calendar, 
  Info, 
  CheckCircle, 
  AlertCircle,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  X,
  RefreshCw,
  Clock,
  Briefcase,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { SalesDeposit, FreelanceRecord, ExpenseRecord } from '../types';
import { formatIDR, formatDateIndo } from '../utils/spreadsheetParser';

// Local storage key constants
const STORAGE_EXPENSES_KEY = 'makayasa_expenses';
const STORAGE_SALES_DEPOSITS_KEY = 'makayasa_sales_deposits';
const STORAGE_FREELANCE_KEY = 'makayasa_freelance_records';

interface LedgerEntry {
  id: string;
  tanggal: Date;
  tipe: 'Pemasukan' | 'Pengeluaran';
  sumber: 'Setoran Sales' | 'Setoran Freelance' | 'Manual Pengeluaran';
  kategori: string;
  deskripsi: string;
  nominal: number;
  referensiId: string;
}

export default function PembukuanKeuangan() {
  // --- STATE ---
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [salesDeposits, setSalesDeposits] = useState<SalesDeposit[]>([]);
  const [freelanceRecords, setFreelanceRecords] = useState<FreelanceRecord[]>([]);
  
  // UI states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'Semua' | 'Pemasukan' | 'Pengeluaran'>('Semua');
  const [filterCategory, setFilterCategory] = useState<string>('Semua');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formCategory, setFormCategory] = useState<ExpenseRecord['kategori']>('Marketing');
  const [formNominal, setFormNominal] = useState<string>('');
  const [formKeterangan, setFormKeterangan] = useState<string>('');

  // --- NOTIFICATION TRIGGER ---
  const triggerNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // --- LOAD ALL DATA ---
  const loadAllData = () => {
    // 1. Load manual expenses
    const savedExpenses = localStorage.getItem(STORAGE_EXPENSES_KEY);
    if (savedExpenses) {
      try {
        const parsed = JSON.parse(savedExpenses) as any[];
        setExpenses(parsed.map(item => ({
          ...item,
          tanggal: new Date(item.tanggal)
        })));
      } catch (e) {
        console.error('Error parsing expenses', e);
      }
    } else {
      const localConfigRaw = localStorage.getItem('makayasa_owner_config');
      const isLive = localConfigRaw ? JSON.parse(localConfigRaw).mode === 'live' : true;
      const isCloudSync = localStorage.getItem('makayasa_cloud_sync_enabled') !== 'false';

      if (isLive || isCloudSync) {
        setExpenses([]);
        localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify([]));
      } else {
        // Seed some dummy expenses for professional look on first visit in demo/simulated mode
        const seedExpenses: ExpenseRecord[] = [
          {
            id: 'EXP-101',
            tanggal: new Date('2026-06-15T10:00:00'),
            kategori: 'Transfer Pabrik',
            nominal: 1200000,
            keterangan: 'Transfer pembayaran bahan baku rokok ke pabrik pusat'
          },
          {
            id: 'EXP-102',
            tanggal: new Date('2026-06-20T14:30:00'),
            kategori: 'Marketing',
            nominal: 150000,
            keterangan: 'Cetak pamflet promosi & banner outlet baru'
          },
          {
            id: 'EXP-103',
            tanggal: new Date('2026-06-24T09:00:00'),
            kategori: 'Operasional',
            nominal: 80000,
            keterangan: 'Uang bensin tambahan pengiriman darurat luar area'
          }
        ];
        setExpenses(seedExpenses);
        localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(seedExpenses));
      }
    }

    // 2. Load Sales Deposits
    const savedDeposits = localStorage.getItem(STORAGE_SALES_DEPOSITS_KEY);
    if (savedDeposits) {
      try {
        const parsed = JSON.parse(savedDeposits) as any[];
        setSalesDeposits(parsed.map(item => ({
          ...item,
          tanggalSetor: new Date(item.tanggalSetor),
          tanggalMulaiPeriode: new Date(item.tanggalMulaiPeriode),
          tanggalSelesaiPeriode: new Date(item.tanggalSelesaiPeriode)
        })));
      } catch (e) {
        console.error('Error parsing sales deposits', e);
      }
    } else {
      setSalesDeposits([]);
    }

    // 3. Load Freelance Records
    const savedFreelance = localStorage.getItem(STORAGE_FREELANCE_KEY);
    if (savedFreelance) {
      try {
        const parsed = JSON.parse(savedFreelance) as any[];
        setFreelanceRecords(parsed.map(item => ({
          ...item,
          tanggalAmbil: new Date(item.tanggalAmbil),
          tanggalLunas: item.tanggalLunas ? new Date(item.tanggalLunas) : undefined
        })));
      } catch (e) {
        console.error('Error parsing freelance records', e);
      }
    } else {
      setFreelanceRecords([]);
    }
  };

  useEffect(() => {
    loadAllData();

    // Set up cross-tab or page synchronization polling
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === STORAGE_EXPENSES_KEY || 
        e.key === STORAGE_SALES_DEPOSITS_KEY || 
        e.key === STORAGE_FREELANCE_KEY
      ) {
        loadAllData();
      }
    };

    const handleSyncUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const key = customEvent.detail?.key;
      if (
        key === STORAGE_EXPENSES_KEY || 
        key === STORAGE_SALES_DEPOSITS_KEY || 
        key === STORAGE_FREELANCE_KEY
      ) {
        loadAllData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('makayasa_sync_update', handleSyncUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('makayasa_sync_update', handleSyncUpdate);
    };
  }, []);

  // --- SAVE EXPENSES ---
  const saveExpenses = (updated: ExpenseRecord[]) => {
    setExpenses(updated);
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(updated));
  };

  // --- ADD MANUAL EXPENSE ---
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const nominalNum = Number(formNominal);
    if (isNaN(nominalNum) || nominalNum <= 0) {
      triggerNotification('Nominal pengeluaran harus lebih besar dari 0!', 'error');
      return;
    }

    const newExpense: ExpenseRecord = {
      id: `EXP-${Math.floor(10000 + Math.random() * 90000)}`,
      tanggal: new Date(formDate),
      kategori: formCategory,
      nominal: nominalNum,
      keterangan: formKeterangan.trim() || `Pengeluaran ${formCategory}`
    };

    const updated = [newExpense, ...expenses];
    saveExpenses(updated);
    setShowAddExpenseModal(false);
    
    // Reset form
    setFormNominal('');
    setFormKeterangan('');
    setFormDate(new Date().toISOString().substring(0, 10));

    triggerNotification(`Pengeluaran sebesar ${formatIDR(nominalNum)} berhasil dicatat!`);
  };

  // --- DELETE LEDGER ENTRY ---
  const handleDeleteLedgerEntry = (entry: LedgerEntry) => {
    const confirmMsg = `Apakah Anda yakin ingin menghapus transaksi ini?
• Tipe: ${entry.tipe}
• Sumber: ${entry.sumber}
• Kategori: ${entry.kategori}
• Detail: ${entry.deskripsi}
• Nominal: ${formatIDR(entry.nominal)}`;

    if (window.confirm(confirmMsg)) {
      if (entry.sumber === 'Setoran Sales') {
        const updated = salesDeposits.filter(dep => dep.id !== entry.referensiId);
        setSalesDeposits(updated);
        localStorage.setItem(STORAGE_SALES_DEPOSITS_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('makayasa_sync_update', { detail: { key: STORAGE_SALES_DEPOSITS_KEY } }));
        triggerNotification('Transaksi setoran sales berhasil dihapus dari Buku Besar!');
      } else if (entry.sumber === 'Setoran Freelance') {
        const updated = freelanceRecords.filter(rec => rec.id !== entry.referensiId);
        setFreelanceRecords(updated);
        localStorage.setItem(STORAGE_FREELANCE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('makayasa_sync_update', { detail: { key: STORAGE_FREELANCE_KEY } }));
        triggerNotification('Transaksi setoran freelance berhasil dihapus dari Buku Besar!');
      } else if (entry.sumber === 'Manual Pengeluaran') {
        const updated = expenses.filter(exp => exp.id !== entry.referensiId);
        saveExpenses(updated);
        window.dispatchEvent(new CustomEvent('makayasa_sync_update', { detail: { key: STORAGE_EXPENSES_KEY } }));
        triggerNotification('Catatan pengeluaran manual berhasil dihapus!');
      }
    }
  };

  // --- CONSOLIDATED LEDGER LOGIC ---
  const consolidatedLedger = useMemo(() => {
    const ledger: LedgerEntry[] = [];

    // 1. Sync from Sales Deposits (Real Cash Received In-hand)
    salesDeposits.forEach(dep => {
      if (dep.jumlahDisetor > 0 && !dep.archived) {
        ledger.push({
          id: `INC-SALES-${dep.id}`,
          tanggal: dep.tanggalSetor,
          tipe: 'Pemasukan',
          sumber: 'Setoran Sales',
          kategori: 'Setoran Salesman',
          deskripsi: `Setoran kas salesman: ${dep.salesName} (Periode ${formatDateIndo(dep.tanggalMulaiPeriode)} - ${formatDateIndo(dep.tanggalSelesaiPeriode)})`,
          nominal: dep.jumlahDisetor,
          referensiId: dep.id
        });
      }
    });

    // 2. Sync from Freelance Records (Actual cash paid to us)
    freelanceRecords.forEach(rec => {
      if (rec.jumlahDibayar > 0 && !rec.archived) {
        // Date of income can be the settlement date or taking date
        const incomeDate = rec.tanggalLunas ? rec.tanggalLunas : rec.tanggalAmbil;
        ledger.push({
          id: `INC-FREE-${rec.id}`,
          tanggal: incomeDate,
          tipe: 'Pemasukan',
          sumber: 'Setoran Freelance',
          kategori: 'Setoran Freelance',
          deskripsi: `Setoran mitra freelance: ${rec.namaFreelance} (${rec.qtyPacks} Pack) ${rec.keterangan ? `- ${rec.keterangan}` : ''}`,
          nominal: rec.jumlahDibayar,
          referensiId: rec.id
        });
      }
    });

    // 3. Sync from Manual Expenses
    expenses.forEach(exp => {
      ledger.push({
        id: exp.id,
        tanggal: exp.tanggal,
        tipe: 'Pengeluaran',
        sumber: 'Manual Pengeluaran',
        kategori: exp.kategori,
        deskripsi: exp.keterangan,
        nominal: exp.nominal,
        referensiId: exp.id
      });
    });

    // Sort by Date Descending, then by ID to keep order completely stable
    return ledger.sort((a, b) => {
      const dateCompare = b.tanggal.getTime() - a.tanggal.getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.id.localeCompare(a.id);
    });
  }, [salesDeposits, freelanceRecords, expenses]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    let totalPemasukan = 0;
    let totalPemasukanSales = 0;
    let totalPemasukanFreelance = 0;
    let totalPengeluaran = 0;
    
    // Categorized expense maps
    const pengeluaranKategori: Record<string, number> = {};

    consolidatedLedger.forEach(entry => {
      if (entry.tipe === 'Pemasukan') {
        totalPemasukan += entry.nominal;
        if (entry.sumber === 'Setoran Sales') {
          totalPemasukanSales += entry.nominal;
        } else if (entry.sumber === 'Setoran Freelance') {
          totalPemasukanFreelance += entry.nominal;
        }
      } else {
        totalPengeluaran += entry.nominal;
        pengeluaranKategori[entry.kategori] = (pengeluaranKategori[entry.kategori] || 0) + entry.nominal;
      }
    });

    const saldoBersih = totalPemasukan - totalPengeluaran;

    return {
      totalPemasukan,
      totalPemasukanSales,
      totalPemasukanFreelance,
      totalPengeluaran,
      saldoBersih,
      pengeluaranKategori
    };
  }, [consolidatedLedger]);

  // --- FILTERING LEDGER ---
  const filteredLedger = useMemo(() => {
    return consolidatedLedger.filter(entry => {
      // 1. Filter by Type
      if (filterType === 'Pemasukan' && entry.tipe !== 'Pemasukan') return false;
      if (filterType === 'Pengeluaran' && entry.tipe !== 'Pengeluaran') return false;

      // 2. Filter by Category
      if (filterCategory !== 'Semua' && entry.kategori !== filterCategory) return false;

      // 3. Filter by Search Term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesDesc = entry.deskripsi.toLowerCase().includes(term);
        const matchesCategory = entry.kategori.toLowerCase().includes(term);
        const matchesId = entry.id.toLowerCase().includes(term);
        const matchesSumber = entry.sumber.toLowerCase().includes(term);
        return matchesDesc || matchesCategory || matchesId || matchesSumber;
      }

      return true;
    });
  }, [consolidatedLedger, filterType, filterCategory, searchTerm]);

  // List of all unique categories present in the ledger for filter dropdown
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    consolidatedLedger.forEach(entry => cats.add(entry.kategori));
    return Array.from(cats);
  }, [consolidatedLedger]);

  // --- DOWNLOAD CSV REPORT ---
  const handleDownloadReport = () => {
    if (filteredLedger.length === 0) {
      triggerNotification('Tidak ada data dalam pembukuan untuk diekspor!', 'error');
      return;
    }

    try {
      // Build beautiful CSV header & body
      let csvContent = '\uFEFF'; // Add UTF-8 BOM for Microsoft Excel compatibility
      csvContent += 'LAPORAN ARUS KAS & PEMBUKUAN KEUANGAN - MAKAYASA JAYA\n';
      csvContent += `Tanggal Ekspor: ${new Date().toLocaleString('id-ID')}\n`;
      csvContent += `Total Pemasukan: ${formatIDR(stats.totalPemasukan)}\n`;
      csvContent += `Total Pengeluaran: ${formatIDR(stats.totalPengeluaran)}\n`;
      csvContent += `Saldo Kas Bersih: ${formatIDR(stats.saldoBersih)}\n\n`;
      
      // Column Headers requested: nomor, tanggal, keterangan/deskripsi, pemasukan, pengeluaran, saldo
      csvContent += 'Nomor,Tanggal,Keterangan/Deskripsi,Pemasukan,Pengeluaran,Saldo\n';
      
      let runningSaldo = 0;
      // Sort oldest first for natural running balance calculation
      const chronologicalList = [...filteredLedger].sort((a, b) => {
        const dateCompare = a.tanggal.getTime() - b.tanggal.getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.id.localeCompare(b.id);
      });

      chronologicalList.forEach((entry, index) => {
        const isIncome = entry.tipe === 'Pemasukan';
        const nominalPemasukan = isIncome ? entry.nominal : 0;
        const nominalPengeluaran = isIncome ? 0 : entry.nominal;
        runningSaldo += (nominalPemasukan - nominalPengeluaran);

        // Escape quotes to prevent CSV breakage
        const cleanDesc = entry.deskripsi.replace(/"/g, '""');
        const formattedDate = entry.tanggal.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
        csvContent += `${index + 1},"${formattedDate}","${cleanDesc}",${nominalPemasukan},${nominalPengeluaran},${runningSaldo}\n`;
      });

      // Create download element
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Laporan_Keuangan_Makayasa_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      triggerNotification('Laporan pembukuan keuangan berhasil diunduh (Excel-friendly CSV)!', 'success');
    } catch (e: any) {
      console.error(e);
      triggerNotification('Gagal mengunduh laporan keuangan.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. NOTIFICATION TOAST */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-bold leading-relaxed transition-all ${
              notification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HEADER BANNER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {/* Decorative background grid and blurs */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
        <div className="absolute -top-24 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full">
                Sistem Buku Kas Utama
              </span>
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Real-time Sinkron
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
              Pembukuan & Arus Kas Utama
            </h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Modul keuangan terintegrasi yang menyatukan seluruh kas masuk (Setoran Sales & Mitra Freelance) serta pencatatan pengeluaran manual (marketing, operasional, transfer pabrik) secara akurat untuk meminimalisir kebocoran kas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setFormDate(new Date().toISOString().substring(0, 10));
                setShowAddExpenseModal(true);
              }}
              className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/15"
            >
              <Plus className="w-4 h-4" /> Catat Pengeluaran
            </button>
            <button
              type="button"
              onClick={handleDownloadReport}
              className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-black px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4 text-slate-400" /> Ekspor Pembukuan
            </button>
          </div>
        </div>
      </div>

      {/* 3. CORE FINANCIAL SUMMARY METRICS CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* CARD A: PEMASUKAN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">Pemasukan Kas (Inflow)</p>
                <p className="text-[9px] text-emerald-600 font-bold mt-0.5">Otomatis Tersinkronisasi</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              100% Real-time
            </span>
          </div>

          <div className="space-y-0.5 pt-1">
            <h3 className="text-xl font-black text-slate-900">{formatIDR(stats.totalPemasukan)}</h3>
            <p className="text-[10px] text-slate-500 font-medium">Akumulasi seluruh setoran kas masuk</p>
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-150/60 space-y-0.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Dari Sales</span>
              <span className="font-extrabold text-slate-700">{formatIDR(stats.totalPemasukanSales)}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-150/60 space-y-0.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Dari Freelance</span>
              <span className="font-extrabold text-slate-700">{formatIDR(stats.totalPemasukanFreelance)}</span>
            </div>
          </div>
        </div>

        {/* CARD B: PENGELUARAN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100 text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">Pengeluaran Kas (Outflow)</p>
                <p className="text-[9px] text-rose-600 font-bold mt-0.5">Input & Catat Manual</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
              Kontrol Komandan
            </span>
          </div>

          <div className="space-y-0.5 pt-1">
            <h3 className="text-xl font-black text-slate-900">{formatIDR(stats.totalPengeluaran)}</h3>
            <p className="text-[10px] text-slate-500 font-medium">Beban operasional & transfer pabrik</p>
          </div>

          {/* Quick breakdown preview of categories */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span className="uppercase text-[8px] tracking-wider block">Beban Tertinggi:</span>
            <span className="font-extrabold text-rose-600">
              {Object.keys(stats.pengeluaranKategori).length > 0 
                ? (() => {
                    const sorted = Object.entries(stats.pengeluaranKategori).sort((a,b) => (b[1] as number) - (a[1] as number));
                    return `${sorted[0][0]} (${formatIDR(sorted[0][1] as number)})`;
                  })()
                : 'Belum Ada Beban'
              }
            </span>
          </div>
        </div>

        {/* CARD C: SALDO KAS BERSIH */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-600">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none">Saldo Kas Bersih</p>
                <p className="text-[9px] text-indigo-600 font-bold mt-0.5">Alokasi Kas Tersedia</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              stats.saldoBersih >= 0 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}>
              {stats.saldoBersih >= 0 ? 'Surplus' : 'Defisit'}
            </span>
          </div>

          <div className="space-y-0.5 pt-1">
            <h3 className={`text-xl font-black ${stats.saldoBersih >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatIDR(stats.saldoBersih)}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Selisih total kas masuk dikurang keluar</p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold">Indikator Kesehatan Kas:</span>
            </div>
            <span className={`font-extrabold ${stats.saldoBersih > 2000000 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {stats.saldoBersih > 0 ? 'Kas Sangat Sehat' : 'Harap Batasi Beban'}
            </span>
          </div>
        </div>

      </div>

      {/* 4. EXPLANATORY INFO ON SINKRONISASI KAS (ANTI-LEAK / ANTI-KEBOCORAN DETAIL) */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4.5 text-xs text-slate-600 flex items-start gap-3.5">
        <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-indigo-500 shrink-0 shadow-sm mt-0.5">
          <Briefcase className="w-4 h-4" />
        </div>
        <div className="space-y-1.5 leading-relaxed">
          <h4 className="font-bold text-slate-900 text-[13px] flex items-center gap-1.5">
            Mekanisme Pencegahan Kebocoran Kas (Sinkronisasi Otomatis)
          </h4>
          <p className="font-medium text-slate-500 text-[11px]">
            Sistem mengamankan pembukuan dengan cara:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] font-medium text-slate-500">
            <li>
              <strong className="text-slate-800">Tanpa Input Pemasukan Ganda:</strong> Semua pemasukan ditarik <span className="text-emerald-600 font-bold">real-time</span> langsung dari uang yang diserah-terimakan di modul <strong className="text-slate-800">Setoran Sales (jumlah disetor)</strong> dan modul <strong className="text-slate-800">Freelance (jumlah dibayar)</strong>. Pemilik tidak perlu menjumlahkan manual dan data dijamin 100% konsisten.
            </li>
            <li>
              <strong className="text-slate-800">Evaluasi Saldo Presisi:</strong> Saldo bersih dihitung seketika. Apabila uang fisik di brankas kantor tidak sesuai dengan <strong className="text-indigo-600 font-bold">Saldo Kas Bersih ({formatIDR(stats.saldoBersih)})</strong> di atas, Anda dapat langsung mengidentifikasi adanya kebocoran (selisih fisik).
            </li>
          </ul>
        </div>
      </div>

      {/* 5. CORE GENERAL LEDGER TABLES & CONTROLS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Filter and Search Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Arsip Buku Kas / Buku Besar Umum</h3>
            <p className="text-[10px] text-slate-500 font-medium">Menampilkan aliran kas keluar masuk teratur</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            
            {/* Search Bar */}
            <div className="relative flex-1 sm:flex-none min-w-[160px] md:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Filter Type */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => { setFilterType('Semua'); setFilterCategory('Semua'); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'Semua' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => { setFilterType('Pemasukan'); setFilterCategory('Semua'); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${filterType === 'Pemasukan' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => { setFilterType('Pengeluaran'); setFilterCategory('Semua'); }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${filterType === 'Pengeluaran' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'}`}
              >
                Keluar
              </button>
            </div>

            {/* Filter Category Select (Only if there are multiple) */}
            {uniqueCategories.length > 0 && (
              <div className="relative">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-700"
                >
                  <option value="Semua">Kategori: Semua</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            )}

          </div>
        </div>

        {/* Unified Table View */}
        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-5">ID Ref</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Aliran / Sumber</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-5">Keterangan / Detail Aliran Kas</th>
                <th className="py-3 px-5 text-right">Nominal</th>
                <th className="py-3 px-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLedger.length > 0 ? (
                filteredLedger.map((entry) => {
                  const isIncome = entry.tipe === 'Pemasukan';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-all">
                      
                      {/* ID REF */}
                      <td className="py-3.5 px-5 font-mono text-[10px] font-bold text-slate-500">
                        {entry.id}
                      </td>

                      {/* DATE */}
                      <td className="py-3.5 px-4 font-bold text-slate-600">
                        {entry.tanggal.toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* FLOW TYPE & SOURCE */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`p-1 rounded-md shrink-0 border ${
                            isIncome 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {isIncome ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                          </span>
                          <div className="space-y-0.5">
                            <span className={`text-[10px] font-extrabold uppercase ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {entry.tipe}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block leading-none">
                              {entry.sumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-700">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px]">
                          {entry.kategori}
                        </span>
                      </td>

                      {/* DESCRIPTION */}
                      <td className="py-3.5 px-5 font-semibold text-slate-600 max-w-sm truncate leading-relaxed" title={entry.deskripsi}>
                        {entry.deskripsi}
                      </td>

                      {/* NOMINAL AMOUNT */}
                      <td className={`py-3.5 px-5 text-right font-black ${
                        isIncome ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isIncome ? '+' : '-'}{formatIDR(entry.nominal)}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteLedgerEntry(entry)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 transition-all flex items-center justify-center mx-auto"
                          title={`Hapus Transaksi ${entry.sumber}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center gap-2 justify-center">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <p className="text-xs">Tidak ada catatan keuangan yang cocok dengan filter aktif.</p>
                      {searchTerm && (
                        <button 
                          onClick={() => setSearchTerm('')} 
                          className="text-[10px] text-indigo-600 hover:underline font-bold"
                        >
                          Reset Pencarian
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats Summary */}
        {filteredLedger.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-semibold">
            <span>Menampilkan {filteredLedger.length} baris riwayat keuangan</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                Pemasukan: <strong className="text-emerald-600 font-black">{formatIDR(filteredLedger.filter(e => e.tipe === 'Pemasukan').reduce((sum, e) => sum + e.nominal, 0))}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                Pengeluaran: <strong className="text-rose-600 font-black">{formatIDR(filteredLedger.filter(e => e.tipe === 'Pengeluaran').reduce((sum, e) => sum + e.nominal, 0))}</strong>
              </span>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: ADD MANUAL EXPENSE */}
      <AnimatePresence>
        {showAddExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden my-8"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-500" />
                  <div>
                    <h4 className="text-xs font-bold">Catat Pengeluaran Baru</h4>
                    <p className="text-[10px] text-slate-400">Kurangi saldo utama untuk beban operasional</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)} 
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleAddExpense} className="p-5 space-y-4">
                
                {/* Date Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Tanggal Transaksi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Kategori Pengeluaran</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="Marketing">Marketing (Promosi, Banner, Sembako, Rokok Gratis)</option>
                    <option value="Biaya Tester/Promosi">Biaya Tester/Promosi (Tester / Bonus Toko / Promo Sales)</option>
                    <option value="Transfer Pabrik">Transfer Pabrik (Pembelian rokok pusat)</option>
                    <option value="Operasional">Operasional (Bensin, Servis Motor, Parkir, Makan Lapangan)</option>
                    <option value="Gaji & Komisi">Gaji & Komisi (Gaji karyawan, insentif / komisi sales)</option>
                    <option value="Sewa & Logistik">Sewa & Logistik (Sewa gudang, armada, packing tape)</option>
                    <option value="Lainnya">Lain-lain (Biaya tak terduga)</option>
                  </select>
                </div>

                {/* Nominal Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Nominal Pengeluaran (IDR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Contoh: 150000"
                      value={formNominal}
                      onChange={(e) => setFormNominal(e.target.value)}
                      className="w-full text-xs font-extrabold border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Keterangan / Deskripsi Transaksi</label>
                  <textarea
                    placeholder="Contoh: Pembelian bensin mobil operasional, transfer DP rokok ke pabrik..."
                    required
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-rose-500 h-20 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddExpenseModal(false)}
                    className="flex-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl py-3 transition-all text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-xl py-3 transition-all text-center shadow-lg shadow-rose-600/10"
                  >
                    Simpan Pengeluaran
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
