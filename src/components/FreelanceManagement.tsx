/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Calendar, 
  Plus, 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  DollarSign, 
  ArrowLeftRight, 
  CheckCircle2, 
  Trash2, 
  RotateCcw, 
  Clock, 
  MapPin, 
  PlusCircle, 
  ChevronDown, 
  ExternalLink,
  Printer,
  ChevronRight,
  UserCheck,
  Percent,
  TrendingUp,
  Package,
  X,
  Archive
} from 'lucide-react';
import { FreelanceRecord, StockEntry, AppConfig } from '../types';
import { formatIDR, formatDateIndo } from '../utils/spreadsheetParser';

interface FreelanceManagementProps {
  pricePerPack?: number;
}

const STORAGE_FREELANCE_KEY = 'makayasa_freelance_records';
const STORAGE_STOCK_KEY = 'makayasa_stok_gudang';

export default function FreelanceManagement({ pricePerPack = 25000 }: FreelanceManagementProps) {
  // --- STATE ---
  const [records, setRecords] = useState<FreelanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Belum Lunas' | 'Lunas'>('Semua');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form States
  const [formName, setFormName] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [formQty, setFormQty] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>(pricePerPack.toString());
  const [formPaymentStatus, setFormPaymentStatus] = useState<'Belum Bayar' | 'Cicil' | 'Lunas'>('Belum Bayar');
  const [formAmountPaid, setFormAmountPaid] = useState<string>('0');
  const [formPotongStok, setFormPotongStok] = useState<boolean>(true);
  const [formNotes, setFormNotes] = useState<string>('');

  // Selected Record states for payment & return updates
  const [selectedRecord, setSelectedRecord] = useState<FreelanceRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [payAmount, setPayAmount] = useState<string>('');
  
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [returnQty, setReturnQty] = useState<string>('');
  const [returnReturnToWarehouse, setReturnReturnToWarehouse] = useState<boolean>(true);

  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState<boolean>(false);
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');

  // --- INITIAL DATA LOAD ---
  const loadFreelanceRecords = () => {
    const saved = localStorage.getItem(STORAGE_FREELANCE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as any[];
        const hydrated = parsed.map(rec => ({
          ...rec,
          tanggalAmbil: new Date(rec.tanggalAmbil),
          tanggalLunas: rec.tanggalLunas ? new Date(rec.tanggalLunas) : undefined
        }));
        setRecords(hydrated);
      } catch (e) {
        console.error('Error hydrating freelance records:', e);
      }
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_FREELANCE_KEY);
    if (saved) {
      loadFreelanceRecords();
    } else {
      const localConfigRaw = localStorage.getItem('makayasa_owner_config');
      const isLive = localConfigRaw ? JSON.parse(localConfigRaw).mode === 'live' : true;
      const isCloudSync = localStorage.getItem('makayasa_cloud_sync_enabled') !== 'false';

      if (isLive || isCloudSync) {
        setRecords([]);
        localStorage.setItem(STORAGE_FREELANCE_KEY, JSON.stringify([]));
      } else {
        // Seed initial dummy freelance records for realistic look and demo
        const seed: FreelanceRecord[] = [
          {
            id: 'FL-20260620-1',
            tanggalAmbil: new Date('2026-06-20'),
            namaFreelance: 'Budi Santoso',
            qtyPacks: 100,
            pricePerPack: 25000,
            totalOmset: 2500000,
            statusPembayaran: 'Lunas',
            jumlahDibayar: 2500000,
            kurangBayar: 0,
            potongStokGudang: true,
            keterangan: 'Setoran lunas h+2 pengambilan barang',
            tanggalLunas: new Date('2026-06-22')
          },
          {
            id: 'FL-20260624-2',
            tanggalAmbil: new Date('2026-06-24'),
            namaFreelance: 'Agus Salim',
            qtyPacks: 50,
            pricePerPack: 25000,
            totalOmset: 1250000,
            statusPembayaran: 'Cicil',
            jumlahDibayar: 500000,
            kurangBayar: 750000,
            potongStokGudang: true,
            keterangan: 'Ambil rokok filter, titip dp 500rb'
          },
          {
            id: 'FL-20260625-3',
            tanggalAmbil: new Date('2026-06-25'),
            namaFreelance: 'Doni Yusuf',
            qtyPacks: 80,
            pricePerPack: 25000,
            totalOmset: 2000000,
            statusPembayaran: 'Belum Bayar',
            jumlahDibayar: 0,
            kurangBayar: 2000000,
            potongStokGudang: true,
            keterangan: 'Ambil rokok kretek, janji setoran senin'
          }
        ];
        setRecords(seed);
        localStorage.setItem(STORAGE_FREELANCE_KEY, JSON.stringify(seed));
      }
    }
  }, []);

  // Sync update listener
  useEffect(() => {
    const handleSyncUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.key === STORAGE_FREELANCE_KEY) {
        loadFreelanceRecords();
      }
    };
    window.addEventListener('makayasa_sync_update', handleSyncUpdate);
    return () => {
      window.removeEventListener('makayasa_sync_update', handleSyncUpdate);
    };
  }, []);

  // Update payment form amount paid automatically if status changes
  useEffect(() => {
    const qty = parseFloat(formQty) || 0;
    const price = parseFloat(formPrice) || pricePerPack;
    const total = qty * price;
    if (formPaymentStatus === 'Lunas') {
      setFormAmountPaid(total.toString());
    } else if (formPaymentStatus === 'Belum Bayar') {
      setFormAmountPaid('0');
    }
  }, [formPaymentStatus, formQty, formPrice, pricePerPack]);

  // Alert system helper
  const triggerNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Save records to state and localStorage
  const saveRecords = (updatedRecords: FreelanceRecord[]) => {
    setRecords(updatedRecords);
    localStorage.setItem(STORAGE_FREELANCE_KEY, JSON.stringify(updatedRecords));
  };

  // Get active freelance list for suggestion dropdown
  const freelancerSuggestions = useMemo(() => {
    const names = records.map(rec => rec.namaFreelance.trim());
    return Array.from(new Set(names)).filter(Boolean);
  }, [records]);

  // --- WAREHOUSE STOCK SYNCRONIZATION ENGINE ---
  const pushToWarehouseStock = (entry: StockEntry) => {
    const saved = localStorage.getItem(STORAGE_STOCK_KEY);
    let stockEntries: StockEntry[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        stockEntries = parsed.map((item: any) => ({
          ...item,
          tanggal: new Date(item.tanggal)
        }));
      } catch (e) {
        console.error('Error parsing stock entries:', e);
      }
    }
    stockEntries.unshift(entry);
    localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify(stockEntries));
  };

  const removeFromWarehouseStock = (targetIdOrSource: string) => {
    const saved = localStorage.getItem(STORAGE_STOCK_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as any[];
      // Remove any stock entry with matching id or description referring to our freelance record
      const filtered = parsed.filter(item => {
        return item.id !== targetIdOrSource && 
               !(item.keterangan && item.keterangan.includes(`ID Referensi: ${targetIdOrSource}`));
      });
      localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error removing from stock:', e);
    }
  };

  // --- ACTION HANDLERS ---
  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    
    const qty = parseInt(formQty, 10);
    const price = parseInt(formPrice, 10);
    const amountPaid = parseInt(formAmountPaid, 10);

    if (!formName.trim()) {
      triggerNotification('Nama freelance harus diisi!', 'error');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      triggerNotification('Jumlah barang diambil harus diisi dengan angka positif!', 'error');
      return;
    }
    if (isNaN(price) || price <= 0) {
      triggerNotification('Harga per pack tidak valid!', 'error');
      return;
    }
    if (isNaN(amountPaid) || amountPaid < 0) {
      triggerNotification('Jumlah uang dibayar tidak valid!', 'error');
      return;
    }

    const totalOmset = qty * price;
    if (amountPaid > totalOmset) {
      triggerNotification('Uang muka tidak boleh melebihi total tagihan omset!', 'error');
      return;
    }

    const kurangBayar = totalOmset - amountPaid;
    const finalStatus: 'Belum Bayar' | 'Cicil' | 'Lunas' = 
      amountPaid === 0 ? 'Belum Bayar' : amountPaid === totalOmset ? 'Lunas' : 'Cicil';

    const recordId = `FL-${Date.now().toString().substring(5)}`;
    
    const newRecord: FreelanceRecord = {
      id: recordId,
      tanggalAmbil: new Date(formDate),
      namaFreelance: formName.trim(),
      qtyPacks: qty,
      pricePerPack: price,
      totalOmset: totalOmset,
      statusPembayaran: finalStatus,
      jumlahDibayar: amountPaid,
      kurangBayar: kurangBayar,
      potongStokGudang: formPotongStok,
      keterangan: formNotes.trim() || undefined,
      tanggalLunas: finalStatus === 'Lunas' ? new Date(formDate) : undefined
    };

    // Auto-deduct from stock warehouse if toggled
    if (formPotongStok) {
      const stockOutEntry: StockEntry = {
        id: `STK-OUT-${Date.now().toString().substring(6)}`,
        tanggal: new Date(formDate),
        tipe: 'Keluar',
        sumberTujuan: `Freelance: ${formName.trim()}`,
        jumlah: qty,
        keterangan: `Ambil barang freelance. ID Referensi: ${recordId}`,
        sumberInput: 'Aplikasi'
      };
      pushToWarehouseStock(stockOutEntry);
    }

    const updated = [newRecord, ...records];
    saveRecords(updated);
    
    // Reset Form
    setFormName('');
    setFormQty('');
    setFormAmountPaid('0');
    setFormNotes('');
    setFormPaymentStatus('Belum Bayar');
    setShowAddForm(false);
    
    triggerNotification(`Data freelance untuk ${formName} berhasil dicatat!`);
  };

  const handleUpdatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    const cashPaid = parseInt(payAmount, 10);
    if (isNaN(cashPaid) || cashPaid <= 0) {
      triggerNotification('Uang setoran harus positif!', 'error');
      return;
    }

    if (cashPaid > selectedRecord.kurangBayar) {
      triggerNotification(`Jumlah setoran (${formatIDR(cashPaid)}) melebihi kurang bayar (${formatIDR(selectedRecord.kurangBayar)})`, 'error');
      return;
    }

    const updatedJumlahDibayar = selectedRecord.jumlahDibayar + cashPaid;
    const updatedKurangBayar = selectedRecord.kurangBayar - cashPaid;
    const updatedStatus: 'Belum Bayar' | 'Cicil' | 'Lunas' = 
      updatedKurangBayar === 0 ? 'Lunas' : 'Cicil';

    const updatedRecords = records.map(rec => {
      if (rec.id === selectedRecord.id) {
        return {
          ...rec,
          jumlahDibayar: updatedJumlahDibayar,
          kurangBayar: updatedKurangBayar,
          statusPembayaran: updatedStatus,
          tanggalLunas: updatedStatus === 'Lunas' ? new Date() : undefined,
          keterangan: rec.keterangan 
            ? `${rec.keterangan} (Setor tambahan Rp ${cashPaid.toLocaleString('id-ID')} tgl ${new Date().toLocaleDateString('id-ID')})`
            : `Setor tambahan Rp ${cashPaid.toLocaleString('id-ID')} tgl ${new Date().toLocaleDateString('id-ID')}`
        };
      }
      return rec;
    });

    saveRecords(updatedRecords);
    setShowPaymentModal(false);
    setSelectedRecord(null);
    setPayAmount('');
    triggerNotification(`Setoran uang freelance sebesar ${formatIDR(cashPaid)} berhasil dicatat!`);
  };

  const handleReturnGoods = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    const returnCount = parseInt(returnQty, 10);
    if (isNaN(returnCount) || returnCount <= 0) {
      triggerNotification('Jumlah rokok yang diretur harus positif!', 'error');
      return;
    }

    const maxReturnable = selectedRecord.qtyPacks - (selectedRecord.returPacks || 0);
    if (returnCount > maxReturnable) {
      triggerNotification(`Jumlah retur melebihi sisa barang yang dibawa (${maxReturnable} Pack)!`, 'error');
      return;
    }

    const totalNewRetur = (selectedRecord.returPacks || 0) + returnCount;
    // Recalculate billable packs
    const billablePacks = selectedRecord.qtyPacks - totalNewRetur;
    const newTotalOmset = billablePacks * selectedRecord.pricePerPack;
    
    // Recalculate billing
    const newKurangBayar = Math.max(0, newTotalOmset - selectedRecord.jumlahDibayar);
    const newStatus: 'Belum Bayar' | 'Cicil' | 'Lunas' = 
      newKurangBayar === 0 ? 'Lunas' : (selectedRecord.jumlahDibayar > 0 ? 'Cicil' : 'Belum Bayar');

    const updatedRecords = records.map(rec => {
      if (rec.id === selectedRecord.id) {
        return {
          ...rec,
          returPacks: totalNewRetur,
          totalOmset: newTotalOmset,
          kurangBayar: newKurangBayar,
          statusPembayaran: newStatus,
          tanggalLunas: newStatus === 'Lunas' ? new Date() : undefined,
          keterangan: rec.keterangan 
            ? `${rec.keterangan} (Retur ${returnCount} Pack tgl ${new Date().toLocaleDateString('id-ID')})`
            : `Retur ${returnCount} Pack tgl ${new Date().toLocaleDateString('id-ID')}`
        };
      }
      return rec;
    });

    // Auto-sync retur back to warehouse if toggled
    if (returnReturnToWarehouse) {
      const stockInEntry: StockEntry = {
        id: `STK-IN-${Date.now().toString().substring(6)}`,
        tanggal: new Date(),
        tipe: 'Masuk',
        sumberTujuan: `Gudang Utama`,
        jumlah: returnCount,
        keterangan: `Stok Masuk (Retur Freelance: ${selectedRecord.namaFreelance}). ID Referensi: ${selectedRecord.id}`,
        sumberInput: 'Aplikasi'
      };
      pushToWarehouseStock(stockInEntry);
    }

    saveRecords(updatedRecords);
    setShowReturnModal(false);
    setSelectedRecord(null);
    setReturnQty('');
    triggerNotification(`Retur barang freelance sebanyak ${returnCount} Pack berhasil diproses!`);
  };

  const handleDeleteRecord = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pencatatan freelance ${name}? Transaksi yang terhubung ke Stok Gudang juga akan dihapus.`)) {
      // 1. Remove references from warehouse stock
      removeFromWarehouseStock(id);
      
      // 2. Remove the record
      const filtered = records.filter(rec => rec.id !== id);
      saveRecords(filtered);
      
      triggerNotification(`Catatan freelance ${name} telah berhasil dihapus.`, 'success');
    }
  };

  const handleArchiveRecords = (type: 'all' | 'lunas') => {
    let toArchiveCount = 0;
    const updatedRecords = records.map(rec => {
      if (rec.archived) return rec;
      
      const shouldArchive = 
        type === 'all' || 
        (type === 'lunas' && rec.statusPembayaran === 'Lunas');
        
      if (shouldArchive) {
        toArchiveCount++;
        return { ...rec, archived: true };
      }
      return rec;
    });

    if (toArchiveCount === 0) {
      triggerNotification(
        type === 'lunas' 
          ? 'Tidak ada transaksi lunas aktif yang bisa diarsipkan!' 
          : 'Tidak ada transaksi aktif untuk diarsipkan!', 
        'error'
      );
      return;
    }

    saveRecords(updatedRecords);
    setShowArchiveConfirmModal(false);
    triggerNotification(
      type === 'lunas'
        ? `Berhasil mengosongkan/mengarsipkan ${toArchiveCount} transaksi freelance yang sudah lunas!`
        : `Berhasil mengosongkan/mengarsipkan seluruh ${toArchiveCount} transaksi freelance ke riwayat!`
    );
  };

  const handleUnarchiveRecord = (id: string) => {
    const updated = records.map(rec => {
      if (rec.id === id) {
        return { ...rec, archived: false };
      }
      return rec;
    });
    saveRecords(updated);
    triggerNotification('Catatan freelance berhasil dikembalikan ke daftar aktif!');
  };

  // --- STATISTICS CALCULATOR ---
  const stats = useMemo(() => {
    const activeRecords = records.filter(rec => !rec.archived);
    let totalFreelancers = new Set(activeRecords.map(rec => rec.namaFreelance)).size;
    let totalPacksTaken = 0;
    let totalOmset = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalReturned = 0;

    activeRecords.forEach(rec => {
      totalPacksTaken += rec.qtyPacks;
      totalOmset += rec.totalOmset;
      totalPaid += rec.jumlahDibayar;
      totalOutstanding += rec.kurangBayar;
      totalReturned += (rec.returPacks || 0);
    });

    return {
      totalFreelancers,
      totalPacksTaken,
      totalOmset,
      totalPaid,
      totalOutstanding,
      totalReturned
    };
  }, [records]);

  // --- SEARCH & FILTER FILTERING ---
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const matchesSearch = rec.namaFreelance.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (rec.keterangan && rec.keterangan.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            rec.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === 'Semua' ? true :
        filterStatus === 'Belum Lunas' ? rec.statusPembayaran !== 'Lunas' :
        rec.statusPembayaran === 'Lunas';

      const matchesArchive = 
        archiveFilter === 'all' ? true :
        archiveFilter === 'archived' ? !!rec.archived :
        !rec.archived;

      return matchesSearch && matchesStatus && matchesArchive;
    });
  }, [records, searchTerm, filterStatus, archiveFilter]);

  return (
    <div className="space-y-6">
      
      {/* Custom Alert/Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg ${
              notification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100' 
                : 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span className="text-sm font-bold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Users className="w-48 h-48 text-white" />
        </div>
        <div className="relative z-10">
          <span className="bg-amber-500/20 text-amber-300 font-extrabold px-3 py-1 rounded-full text-xs uppercase tracking-wider border border-amber-500/30">
            Logistik & Distribusi Alternatif
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-3 leading-tight tracking-tight">MANAJEMEN MITRA FREELANCE</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-xl font-medium leading-relaxed">
            Pantau barang keluar, setoran omset, dan retur rokok dari mitra freelance. 
            Terintegrasi langsung ke <strong>Stok Gudang</strong> untuk menghentikan kebocoran inventaris akibat lupa pencatatan.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              Catat Ambil Barang Manual
            </button>
            <button
              onClick={() => setShowArchiveConfirmModal(true)}
              className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/10 border border-rose-700/50"
            >
              <Archive className="w-4 h-4" />
              Mulai Periode Baru / Kosongkan Data
            </button>
            <a 
              href="#freelance_table"
              className="bg-slate-800 hover:bg-slate-750 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <FileText className="w-4 h-4" />
              Tampilkan Semua Riwayat
            </a>
          </div>
        </div>
      </div>

      {/* Key Metrics row */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        <div className="bg-white p-3.5 xs:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[9px] xs:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mitra Freelance</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><Users className="w-4 h-4" /></span>
          </div>
          <div className="mt-2">
            <h3 className="text-base xs:text-lg sm:text-xl lg:text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.totalFreelancers}</h3>
            <p className="text-[9px] xs:text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">Orang Mitra Terdaftar</p>
          </div>
        </div>

        <div className="bg-white p-3.5 xs:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[9px] xs:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Barang Diambil</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg shrink-0"><Package className="w-4 h-4" /></span>
          </div>
          <div className="mt-2">
            <h3 className="text-base xs:text-lg sm:text-xl lg:text-2xl font-black text-slate-900 font-mono tracking-tight">{stats.totalPacksTaken} <span className="text-xs font-semibold text-slate-500">Pack</span></h3>
            <p className="text-[9px] xs:text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">Total Rokok Keluar</p>
          </div>
        </div>

        <div className="bg-white p-3.5 xs:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[9px] xs:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Omset</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <div className="mt-2">
            <h3 className="text-sm xs:text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-slate-900 font-mono tracking-tight break-all">{formatIDR(stats.totalOmset)}</h3>
            <p className="text-[9px] xs:text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">Setelah Dipotong Retur</p>
          </div>
        </div>

        <div className="bg-white p-3.5 xs:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[9px] xs:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Setoran Masuk</span>
            <span className="p-1.5 bg-sky-50 text-sky-600 rounded-lg shrink-0"><DollarSign className="w-4 h-4" /></span>
          </div>
          <div className="mt-2">
            <h3 className="text-sm xs:text-base sm:text-lg lg:text-xl xl:text-2xl font-black text-emerald-600 font-mono tracking-tight break-all">{formatIDR(stats.totalPaid)}</h3>
            <p className="text-[9px] xs:text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">Uang Cash Diterima</p>
          </div>
        </div>

        <div className="bg-white p-3.5 xs:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between col-span-1 xs:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start gap-1">
            <span className="text-[9px] xs:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Piutang Freelance</span>
            <span className={`p-1.5 rounded-lg shrink-0 ${stats.totalOutstanding > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className={`text-sm xs:text-base sm:text-lg lg:text-xl xl:text-2xl font-black font-mono tracking-tight break-all ${stats.totalOutstanding > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
              {formatIDR(stats.totalOutstanding)}
            </h3>
            <p className="text-[9px] xs:text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">
              {stats.totalOutstanding > 0 ? '⚠️ Potensi Leak / Belum Ditagih' : 'Semua Bersih Setoran'}
            </p>
          </div>
        </div>

      </div>

      {/* Collapsible Add Entry Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-amber-500/10 text-amber-600 flex items-center justify-center rounded-lg">
                    <PlusCircle className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Input Data Pengambilan Freelance</h3>
                    <p className="text-[10px] text-slate-400">Pastikan input data dengan benar agar terpotong langsung dari stok gudang.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddRecord} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Form Col 1 */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">NAMA MITRA FREELANCE</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ketik nama freelance..."
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                        list="freelancers_list"
                      />
                      <datalist id="freelancers_list">
                        {freelancerSuggestions.map(name => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">TANGGAL AMBIL BARANG</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                  </div>
                </div>

                {/* Form Col 2 */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">JUMLAH AMBIL (PACK)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Contoh: 50"
                        value={formQty}
                        onChange={(e) => setFormQty(e.target.value)}
                        className="w-full text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">HARGA PER PACK (Rp)</label>
                      <input
                        type="number"
                        required
                        min="1000"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">STATUS SETORAN</label>
                      <select
                        value={formPaymentStatus}
                        onChange={(e) => setFormPaymentStatus(e.target.value as any)}
                        className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                      >
                        <option value="Belum Bayar">Belum Bayar</option>
                        <option value="Cicil">Cicil / Uang Muka</option>
                        <option value="Lunas">Langsung Lunas</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">UANG DIBAYAR (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        disabled={formPaymentStatus === 'Belum Bayar' || formPaymentStatus === 'Lunas'}
                        value={formAmountPaid}
                        onChange={(e) => setFormAmountPaid(e.target.value)}
                        className={`w-full text-xs font-bold font-mono border rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all ${
                          formPaymentStatus === 'Belum Bayar' || formPaymentStatus === 'Lunas'
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-50 border-slate-200 focus:bg-white'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Form Col 3 */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">KETERANGAN TAMBAHAN</label>
                    <input
                      type="text"
                      placeholder="Catatan barang/janji tempo..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                  </div>

                  {/* Stock Deduction Toggle switch */}
                  <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-800">POTONG STOK GUDANG UTAMA</h4>
                        <p className="text-[8px] text-slate-500">Mendaftarkan 'Stok Keluar' otomatis</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formPotongStok} 
                        onChange={(e) => setFormPotongStok(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl py-2.5 transition-all text-center"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl py-2.5 transition-all shadow-md shadow-amber-500/10 text-center"
                    >
                      Simpan Data
                    </button>
                  </div>
                </div>

              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Table view */}
      <div id="freelance_table" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Filters & Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <span>Arsip Pengambilan Barang Freelance</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                {filteredRecords.length} Catatan
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Cari, saring dan kelola status pembayaran/setoran rokok freelance.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Box */}
            <div className="relative w-full sm:w-60">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><Search className="w-3.5 h-3.5" /></span>
              <input
                type="text"
                placeholder="Cari nama freelance / id..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>

            {/* Filter Status Pills */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              {(['Semua', 'Belum Lunas', 'Lunas'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                    filterStatus === status 
                      ? 'bg-white text-slate-950 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Filter Arsip Pills */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              {([
                { id: 'active', label: 'Daftar Aktif' },
                { id: 'archived', label: 'Arsip (Riwayat)' },
                { id: 'all', label: 'Semua Data' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setArchiveFilter(tab.id)}
                  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${
                    archiveFilter === tab.id 
                      ? 'bg-white text-slate-950 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* The Records Table */}
        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Users className="w-12 h-12 text-slate-200 mx-auto" />
              <p className="text-xs font-semibold">Tidak ada data freelance yang sesuai pencarian atau filter.</p>
              <button 
                onClick={() => { setSearchTerm(''); setFilterStatus('Semua'); }}
                className="text-[10px] text-amber-600 font-extrabold hover:underline"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Tgl Ambil</th>
                  <th className="py-3 px-4">ID / Mitra</th>
                  <th className="py-3 px-4">Barang Diambil</th>
                  <th className="py-3 px-4">Total Omset</th>
                  <th className="py-3 px-4">Pembayaran (Cash)</th>
                  <th className="py-3 px-4">Piutang / Sisa</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi / Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const hasRetur = rec.returPacks && rec.returPacks > 0;
                  const originalTotal = rec.qtyPacks * rec.pricePerPack;
                  
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50 text-xs transition-colors">
                      
                      {/* Date */}
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateIndo(rec.tanggalAmbil)}</span>
                        </div>
                      </td>

                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{rec.namaFreelance}</div>
                        <div className="text-[9px] font-mono font-semibold text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
                          <span>{rec.id}</span>
                          {rec.potongStokGudang && (
                            <span className="inline-flex bg-emerald-50 text-emerald-600 px-1 rounded text-[8px] border border-emerald-100 font-sans" title="Stok Gudang Terpotong Otomatis">
                              📦 Stok Sync
                            </span>
                          )}
                          {rec.archived && (
                            <span className="inline-flex bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] border border-slate-200 font-sans font-bold" title="Record ini telah diarsipkan">
                              📁 Terarsip
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quantity taken */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold font-mono text-slate-800">
                          {rec.qtyPacks} Pack
                        </div>
                        {hasRetur && (
                          <div className="text-[9px] font-semibold text-rose-500 flex items-center gap-0.5 mt-0.5">
                            <span>Retur: {rec.returPacks} Pack</span>
                          </div>
                        )}
                      </td>

                      {/* Total cost / Omset */}
                      <td className="py-3.5 px-4 font-bold font-mono text-slate-900">
                        {formatIDR(rec.totalOmset)}
                        {hasRetur && (
                          <div className="text-[8px] text-slate-400 font-semibold line-through">
                            {formatIDR(originalTotal)}
                          </div>
                        )}
                      </td>

                      {/* Paid Cash */}
                      <td className="py-3.5 px-4 text-emerald-600 font-extrabold font-mono">
                        {formatIDR(rec.jumlahDibayar)}
                      </td>

                      {/* Unpaid Sisa */}
                      <td className="py-3.5 px-4">
                        <span className={`font-black font-mono ${rec.kurangBayar > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {rec.kurangBayar === 0 ? 'Rp 0' : formatIDR(rec.kurangBayar)}
                        </span>
                        {rec.kurangBayar > 0 && (
                          <span className="block text-[8px] text-amber-600 font-bold mt-0.5 animate-pulse">
                            ⚠️ Perlu Ditagih
                          </span>
                        )}
                      </td>

                      {/* Payment badge status */}
                      <td className="py-3.5 px-4">
                        {rec.statusPembayaran === 'Lunas' ? (
                          <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded text-[9px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Lunas
                          </span>
                        ) : rec.statusPembayaran === 'Cicil' ? (
                          <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 font-black px-2 py-0.5 rounded text-[9px] border border-indigo-150">
                            <Clock className="w-3 h-3 text-indigo-600" /> Dicicil
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 font-black px-2 py-0.5 rounded text-[9px] border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" /> Belum Bayar
                          </span>
                        )}
                      </td>

                      {/* Controls and buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          
                          {/* Payment Button */}
                          {!rec.archived && rec.kurangBayar > 0 && (
                            <button
                              onClick={() => {
                                setSelectedRecord(rec);
                                setPayAmount(rec.kurangBayar.toString());
                                setShowPaymentModal(true);
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black px-2 py-1 rounded text-[10px] transition-all border border-indigo-200 flex items-center gap-0.5"
                              title="Setor Uang / Cicil"
                            >
                              <DollarSign className="w-3 h-3" /> Setor
                            </button>
                          )}

                          {/* Retur Button */}
                          {!rec.archived && rec.qtyPacks - (rec.returPacks || 0) > 0 && (
                            <button
                              onClick={() => {
                                setSelectedRecord(rec);
                                setReturnQty('');
                                setReturnReturnToWarehouse(rec.potongStokGudang);
                                setShowReturnModal(true);
                              }}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-black px-2 py-1 rounded text-[10px] transition-all border border-rose-200 flex items-center gap-0.5"
                              title="Retur Rokok Tidak Terjual"
                            >
                              <RotateCcw className="w-3 h-3" /> Retur
                            </button>
                          )}

                          {/* Restore Button (Pulihkan) if archived */}
                          {rec.archived && (
                            <button
                              onClick={() => handleUnarchiveRecord(rec.id)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-black px-2 py-1 rounded text-[10px] transition-all border border-amber-200 flex items-center gap-0.5 animate-fade-in"
                              title="Pulihkan ke Daftar Aktif"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-600" /> Pulihkan
                            </button>
                          )}

                          {/* Print Receipt button */}
                          <button
                            onClick={() => {
                              setSelectedRecord(rec);
                              setShowReceiptModal(true);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 rounded transition-all border border-slate-200"
                            title="Tampilkan Nota Freelance"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteRecord(rec.id, rec.namaFreelance)}
                            className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-all"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* MODAL 1: SETOR UANG PAYMENT MODAL */}
      <AnimatePresence>
        {showPaymentModal && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-xs font-bold">Catat Setoran Uang</h4>
                    <p className="text-[10px] text-slate-400">{selectedRecord.namaFreelance}</p>
                  </div>
                </div>
                <button onClick={() => { setShowPaymentModal(false); setSelectedRecord(null); }} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdatePayment} className="p-5 space-y-4">
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Sisa Piutang:</span>
                    <span className="font-extrabold font-mono text-rose-600">{formatIDR(selectedRecord.kurangBayar)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Total Barang:</span>
                    <span className="font-bold text-slate-800">{selectedRecord.qtyPacks} Pack</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">JUMLAH CASH SETORAN (Rp)</label>
                  <input
                    type="number"
                    required
                    max={selectedRecord.kurangBayar}
                    min="1"
                    placeholder="Contoh: 500000"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full text-sm font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Uang setoran tidak boleh melebihi sisa piutang ({formatIDR(selectedRecord.kurangBayar)}).</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowPaymentModal(false); setSelectedRecord(null); }}
                    className="flex-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl py-2.5 transition-all text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl py-2.5 transition-all shadow-md shadow-amber-500/10 text-center"
                  >
                    Konfirmasi Setoran
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RETUR BARANG MODAL */}
      <AnimatePresence>
        {showReturnModal && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-rose-400" />
                  <div>
                    <h4 className="text-xs font-bold">Proses Retur Rokok</h4>
                    <p className="text-[10px] text-slate-400">{selectedRecord.namaFreelance}</p>
                  </div>
                </div>
                <button onClick={() => { setShowReturnModal(false); setSelectedRecord(null); }} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleReturnGoods} className="p-5 space-y-4">
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Barang Dibawa:</span>
                    <span className="font-bold text-slate-800">{selectedRecord.qtyPacks - (selectedRecord.returPacks || 0)} Pack</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Harga Jual:</span>
                    <span className="font-bold font-mono text-slate-600">{formatIDR(selectedRecord.pricePerPack)} / Pack</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">JUMLAH BARANG DIRETUR (PACK)</label>
                  <input
                    type="number"
                    required
                    max={selectedRecord.qtyPacks - (selectedRecord.returPacks || 0)}
                    min="1"
                    placeholder="Contoh: 5"
                    value={returnQty}
                    onChange={(e) => setReturnQty(e.target.value)}
                    className="w-full text-sm font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Rokok retur akan mengurangi nilai tagihan omset secara otomatis.</p>
                </div>

                {/* Return Stock to Warehouse Option */}
                <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <h4 className="text-[10px] font-extrabold text-slate-800">KEMBALIKAN STOK KE GUDANG</h4>
                      <p className="text-[8px] text-slate-500">Otomatis tambah sisa stok gudang</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={returnReturnToWarehouse} 
                      onChange={(e) => setReturnReturnToWarehouse(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowReturnModal(false); setSelectedRecord(null); }}
                    className="flex-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl py-2.5 transition-all text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 text-xs font-black text-slate-950 bg-rose-500 hover:bg-rose-400 rounded-xl py-2.5 transition-all shadow-md shadow-rose-500/10 text-center"
                  >
                    Konfirmasi Retur
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: NOTA FREELANCE DIALOG (RECEIPT) */}
      <AnimatePresence>
        {showReceiptModal && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <span className="text-xs font-bold tracking-wider flex items-center gap-1.5 uppercase">
                  <Printer className="w-4 h-4" /> NOTA PENGAMBILAN FREELANCE
                </span>
                <button onClick={() => { setShowReceiptModal(false); setSelectedRecord(null); }} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Receipt Body */}
              <div id="print_area" className="p-6 space-y-6 bg-slate-50">
                
                {/* Header info */}
                <div className="text-center pb-4 border-b border-dashed border-slate-300">
                  <h3 className="text-md font-black tracking-tight text-slate-900">MAKAYASA JAYA COMMAND CENTER</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Nota Surat Jalan & Transaksi Freelance</p>
                  <p className="text-[9px] font-mono text-slate-500 mt-1">Ref ID: {selectedRecord.id}</p>
                </div>

                {/* Details Column */}
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Tgl Pengambilan:</span>
                    <span className="font-bold text-slate-800">{formatDateIndo(selectedRecord.tanggalAmbil)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Nama Freelancer:</span>
                    <span className="font-black text-slate-900 text-sm">{selectedRecord.namaFreelance}</span>
                  </div>
                  {selectedRecord.tanggalLunas && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">Tanggal Pelunasan:</span>
                      <span className="font-bold text-emerald-600">{formatDateIndo(selectedRecord.tanggalLunas)}</span>
                    </div>
                  )}
                  {selectedRecord.keterangan && (
                    <div className="flex flex-col pt-1.5 border-t border-slate-200">
                      <span className="text-slate-400 font-bold text-[10px] uppercase">KETERANGAN/CATATAN:</span>
                      <span className="italic text-slate-600 text-[11px] mt-0.5">{selectedRecord.keterangan}</span>
                    </div>
                  )}
                </div>

                {/* Financial Math table */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs pb-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-500">
                      Ambil ({selectedRecord.qtyPacks} Pack) x {formatIDR(selectedRecord.pricePerPack)}
                    </span>
                    <span className="font-bold font-mono text-slate-800">
                      {formatIDR(selectedRecord.qtyPacks * selectedRecord.pricePerPack)}
                    </span>
                  </div>
                  
                  {selectedRecord.returPacks && selectedRecord.returPacks > 0 ? (
                    <div className="flex justify-between text-xs text-rose-600 pb-1.5 border-b border-slate-100">
                      <span className="font-semibold">
                        Retur Rokok ({selectedRecord.returPacks} Pack)
                      </span>
                      <span className="font-bold font-mono">
                        -{formatIDR(selectedRecord.returPacks * selectedRecord.pricePerPack)}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex justify-between text-xs font-extrabold text-slate-900 pt-1">
                    <span>Total Tagihan Omset:</span>
                    <span className="font-mono text-slate-900">{formatIDR(selectedRecord.totalOmset)}</span>
                  </div>
                  
                  <div className="flex justify-between text-xs text-emerald-600 font-extrabold pt-1">
                    <span>Kas Setoran Terbayar:</span>
                    <span className="font-mono">-{formatIDR(selectedRecord.jumlahDibayar)}</span>
                  </div>

                  <div className="flex justify-between text-sm font-black border-t-2 border-dashed border-slate-200 pt-2 text-slate-950">
                    <span>Sisa Piutang:</span>
                    <span className="font-mono text-rose-600">
                      {selectedRecord.kurangBayar === 0 ? 'LUNAS (Rp 0)' : formatIDR(selectedRecord.kurangBayar)}
                    </span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400">
                  <div>
                    <p className="font-semibold">Tanda Terima Mitra,</p>
                    <div className="h-12"></div>
                    <p className="font-extrabold text-slate-800 underline uppercase">{selectedRecord.namaFreelance}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Komandan Makayasa,</p>
                    <div className="h-12"></div>
                    <p className="font-extrabold text-slate-800 underline uppercase">Pimpinan Gudang</p>
                  </div>
                </div>

              </div>

              {/* Printing controls */}
              <div className="p-4 bg-slate-100 border-t border-slate-200 flex gap-2">
                <button
                  onClick={() => { setShowReceiptModal(false); setSelectedRecord(null); }}
                  className="flex-1 text-xs font-bold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl py-2.5 transition-all text-center"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl py-2.5 transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Cetak / Print Nota
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: ARCHIVE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showArchiveConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-xs font-bold">Mulai Periode Baru / Arsipkan Data</h4>
                    <p className="text-[10px] text-slate-400">Kosongkan data aktif & simpan ke riwayat</p>
                  </div>
                </div>
                <button onClick={() => setShowArchiveConfirmModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-xs leading-relaxed space-y-2">
                  <p className="font-extrabold flex items-center gap-1 text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    BAGAIMANA CARA KERJA FITUR INI?
                  </p>
                  <p className="font-semibold text-[11px]">
                    Fitur ini akan mengosongkan statistik panel utama (Mitra Freelance, Total Barang Diambil, Omset, dll.) kembali menjadi <strong className="text-amber-900">NOL (0)</strong> untuk memulai siklus keuangan atau pembukuan baru.
                  </p>
                  <p className="font-semibold text-[11px]">
                    Semua transaksi yang diarsipkan akan <strong className="text-amber-900">TETAP DISIMPAN</strong> dan bisa diakses kapan saja melalui tab <strong className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">Arsip (Riwayat)</strong> di tabel bawah.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">PILIH METODE PENGOSONGAN DATA</label>
                  
                  {/* Option 1: Archive Lunas Only */}
                  <button
                    onClick={() => handleArchiveRecords('lunas')}
                    className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-start gap-3 group"
                  >
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                    <div className="flex-1">
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Arsip Hanya yang LUNAS</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Sangat Direkomendasikan. Hanya mengosongkan transaksi yang setoran uangnya sudah lunas. Mitra yang masih memiliki utang/piutang tetap tampil aktif.</p>
                    </div>
                  </button>

                  {/* Option 2: Archive All */}
                  <button
                    onClick={() => {
                      if (window.confirm("Apakah Anda yakin ingin mengarsipkan seluruh transaksi termasuk yang BELUM LUNAS? Utang/piutang aktif juga akan dipindahkan ke riwayat.")) {
                        handleArchiveRecords('all');
                      }
                    }}
                    className="w-full text-left p-3.5 bg-rose-50/30 hover:bg-rose-50/60 border border-rose-100 rounded-xl transition-all flex items-start gap-3 group"
                  >
                    <span className="w-8 h-8 bg-rose-50 text-rose-600 group-hover:bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                      <Archive className="w-5 h-5" />
                    </span>
                    <div className="flex-1">
                      <h5 className="text-xs font-bold text-rose-900 group-hover:text-rose-700 transition-colors">Arsip SELURUH Transaksi</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Memindahkan semua catatan aktif ke dalam riwayat tanpa terkecuali, baik yang sudah lunas maupun yang belum lunas.</p>
                    </div>
                  </button>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowArchiveConfirmModal(false)}
                    className="flex-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl py-2.5 transition-all text-center"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
