/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Search, 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Building2, 
  User, 
  DollarSign, 
  ShoppingBag, 
  Map, 
  ArrowRight, 
  Sparkles, 
  Info,
  Compass,
  Zap,
  Target,
  FileText
} from 'lucide-react';
import { Transaction } from '../types';
import { formatIDR } from '../utils/spreadsheetParser';

interface WilayahAreaProps {
  transactions: Transaction[];
}

// Canonical 31 Kecamatan in Jember
const JEMBER_KECAMATAN = [
  'Ajung', 'Ambulu', 'Arjasa', 'Bangsalsari', 'Balung', 'Gumukmas', 'Jelbuk', 
  'Jenggawah', 'Jombang', 'Kalisat', 'Kaliwates', 'Kencong', 'Ledokombo', 
  'Mayang', 'Mumbulsari', 'Panti', 'Pakusari', 'Patrang', 'Puger', 'Rambipuji', 
  'Semboro', 'Silo', 'Sukorambi', 'Sukowono', 'Sumberbaru', 'Sumberjambe', 
  'Sumbersari', 'Tanggul', 'Tempurejo', 'Umbulsari', 'Wuluhan'
];

// Mapping of major Villages (Desa/Kelurahan) for each of the 31 Kecamatan in Jember
const KECAMATAN_VILLAGES: Record<string, string[]> = {
  'Ajung': ['Ajung', 'Pancakarya', 'Wirowongso', 'Sukamakmur', 'Klompangan', 'Mangaran'],
  'Ambulu': ['Ambulu', 'Karang Anyar', 'Sumberejo', 'Tegalsari', 'Sabrang', 'Pontang'],
  'Arjasa': ['Arjasa', 'Kemuning Lor', 'Bitoro', 'Darsono', 'Candijati', 'Arco'],
  'Bangsalsari': ['Bangsalsari', 'Tugusari', 'Banjarsari', 'Sukorejo', 'Gambirono', 'Petung'],
  'Balung': ['Balung Lor', 'Balung Kulon', 'Balung Kidul', 'Tutul', 'Curahlele', 'Gumelar'],
  'Gumukmas': ['Gumukmas', 'Purwoasri', 'Menampu', 'Bagorejo', 'Tembokrejo', 'Mayangan'],
  'Jelbuk': ['Jelbuk', 'Panduman', 'Sucopangepok', 'Arjasa', 'Sugerkidul', 'Sukojember'],
  'Jenggawah': ['Jenggawah', 'Wonojati', 'Cangkring', 'Kertonegoro', 'Sruni', 'Jatimulyo'],
  'Jombang': ['Jombang', 'Padomasan', 'Ngampelrejo', 'Keting', 'Sarimulyo'],
  'Kalisat': ['Kalisat', 'Glagahwero', 'Ajung', 'Plalangan', 'Sumberjeruk', 'Patempuran'],
  'Kaliwates': ['Kaliwates', 'Jember Kidul', 'Kepatihan', 'Tegal Besar', 'Sempusari', 'Kebon Agung', 'Mangli'],
  'Kencong': ['Kencong', 'Wonorejo', 'Paseban', 'Kraton', 'Kepanjangan'],
  'Ledokombo': ['Ledokombo', 'Slateng', 'Sumberlesung', 'Karangpaiton', 'Lembengan', 'Sumberbulu'],
  'Mayang': ['Mayang', 'Tegalrejo', 'Seputih', 'Mrawan', 'Sumberkejayan'],
  'Mumbulsari': ['Mumbulsari', 'Lengkong', 'Kawangrejo', 'Suco', 'Tamansari', 'Karang Kedawung'],
  'Panti': ['Panti', 'Kemiri', 'Serut', 'Pakis', 'Glagahwero', 'Suci'],
  'Pakusari': ['Pakusari', 'Kertosari', 'Sumberpinang', 'Patemon', 'Subo', 'Bedadung'],
  'Patrang': ['Patrang', 'Baratan', 'Bintoro', 'Jemberlor', 'Slawu', 'Gebang', 'Jumerto'],
  'Puger': ['Puger Kulon', 'Puger Wetan', 'Grenden', 'Meningguran', 'Wringintelu', 'Baban'],
  'Rambipuji': ['Rambipuji', 'Rambigundam', 'Pecoro', 'Kaliwening', 'Rowotamtu', 'Nogosari'],
  'Semboro': ['Semboro', 'Sidomekar', 'Rejoagung', 'Pondokjoyo', 'Pondokdalem'],
  'Silo': ['Garahan', 'Sempolan', 'Pace', 'Silo', 'Karangharjo', 'Mulyorejo', 'Sidomulyo'],
  'Sukorambi': ['Sukorambi', 'Jubung', 'Karangpring', 'Klungkung', 'Dukuhmencek'],
  'Sukowono': ['Sukowono', 'Sukokerto', 'Balet Baru', 'Arjasa', 'Sukorejo', 'Dawuhanmangli'],
  'Sumberbaru': ['Sumberbaru', 'Yosorati', 'Gelang', 'Jamintoro', 'Kaliglagah', 'Rowotengah'],
  'Sumberjambe': ['Sumberjambe', 'Cumedak', 'Rowosari', 'Randuagung', 'Plerean', 'Jambearum'],
  'Sumbersari': ['Sumbersari', 'Kebonsari', 'Karangrejo', 'Wirolegi', 'Kranjingan', 'Antirogo', 'Gladak Kembar'],
  'Tanggul': ['Tanggul Kulon', 'Tanggul Wetan', 'Klatakan', 'Selodakon', 'Patemon', 'Darungan'],
  'Tempurejo': ['Tempurejo', 'Curahtakir', 'Andongrejo', 'Sanenrejo', 'Wonoasri', 'Sidoasri'],
  'Umbulsari': ['Umbulsari', 'Gadingrejo', 'Gunungsari', 'Tanjungsari', 'Sidorejo', 'Mundurejo'],
  'Wuluhan': ['Wuluhan', 'Dukuhdempit', 'Lojejer', 'Kesilir', 'Tanjungrejo', 'Ampel']
};

// Match transaction to Jember Desa/Kelurahan dynamically
const getDesaForTransaction = (tx: Transaction, kecName: string): string => {
  if (tx.desa && tx.desa.trim()) {
    return tx.desa.trim();
  }
  
  if (tx.storeAddress) {
    const addressLower = tx.storeAddress.toLowerCase();
    
    // 1. Check known list of villages for this specific kecamatan
    if (kecName && KECAMATAN_VILLAGES[kecName]) {
      for (const v of KECAMATAN_VILLAGES[kecName]) {
        const regex = new RegExp(`\\b${v.toLowerCase()}\\b`, 'i');
        if (regex.test(addressLower)) {
          return v;
        }
      }
    }
    
    // 2. Try parsing with regex pattern like "ds. <village>" or "desa <village>"
    const match = tx.storeAddress.match(/(?:ds\.?|desa|kel\.?|kelurahan)\s+([a-zA-Z\s]{3,20})/i);
    if (match && match[1]) {
      const parsed = match[1].trim().split(/\s+/).slice(0, 2).join(' '); // take first 2 words
      return parsed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }
  
  return 'Pusat / Ritel';
};

// Normalize name helper
const normalizeKecName = (name: string): string => {
  const clean = name.toLowerCase().replace(/^(kecamatan|kec\.)\s+/i, '').trim();
  if (clean === 'sbr jambe' || clean === 'sbrjambe' || clean === 'sumber jambe') return 'sumberjambe';
  if (clean === 'klisat') return 'kalisat';
  if (clean === 'sbr baru' || clean === 'sbrbaru' || clean === 'sumber baru') return 'sumberbaru';
  if (clean === 'gkm' || clean === 'gumuk mas') return 'gumukmas';
  if (clean === 'umbul sari') return 'umbulsari';
  if (clean === 'bangsal') return 'angsalsari';
  return clean.replace(/\s+/g, '');
};

// Match transaction to Jember Kecamatan
const getKecamatanForTransaction = (tx: Transaction): string | null => {
  if (tx.kecamatan) {
    const matched = JEMBER_KECAMATAN.find(k => normalizeKecName(k) === normalizeKecName(tx.kecamatan!));
    if (matched) return matched;
  }
  
  if (tx.storeAddress) {
    const addressLower = tx.storeAddress.toLowerCase();
    for (const kec of JEMBER_KECAMATAN) {
      const kecLower = kec.toLowerCase();
      // Look for the kecamatan name as a whole word or with delimiters
      const regex = new RegExp(`\\b${kecLower}\\b`, 'i');
      if (regex.test(addressLower)) {
        return kec;
      }
    }
  }
  
  if (tx.storeName) {
    const nameLower = tx.storeName.toLowerCase();
    for (const kec of JEMBER_KECAMATAN) {
      const kecLower = kec.toLowerCase();
      const regex = new RegExp(`\\b${kecLower}\\b`, 'i');
      if (regex.test(nameLower)) {
        return kec;
      }
    }
  }
  
  return null;
};

// Tactical suggestion based on status and geographical notes
const getTacticalNotes = (kecName: string, status: 'HIGH' | 'MEDIUM' | 'UNTOUCHED', storeCount: number, packs: number): {
  strategy: string;
  notes: string;
  targetOutlet: string;
} => {
  switch (status) {
    case 'HIGH':
      return {
        strategy: 'PERTAHANKAN DOMINASI & SATURASI PASAR',
        notes: `Wilayah ${kecName} memiliki penetrasi pasar yang sangat kuat dengan ${storeCount} outlet aktif dan total distribusi ${packs} pack. Fokus pada menjaga loyalitas pelanggan (Repeat Order), penataan display produk, dan pengawasan ketat terhadap kompetitor lokal.`,
        targetOutlet: 'Fokus pada grosir besar dan sub-distributor untuk program bundling.'
      };
    case 'MEDIUM':
      return {
        strategy: 'EKSPANSI PENJUALAN & OPTIMALISASI KUNJUNGAN',
        notes: `Terdapat penetrasi awal di ${kecName} (${storeCount} outlet, ${packs} pack). Wilayah ini sangat potensial untuk ditingkatkan menjadi wilayah dominan. Jadwalkan kunjungan sales lebih teratur (minimal 1x seminggu) dan berikan promo eksklusif untuk toko baru yang melakukan repeat buy.`,
        targetOutlet: 'Targetkan 5 toko kelontong baru di sepanjang jalur utama kecamatan.'
      };
    case 'UNTOUCHED':
      // Customize recommendations based on real Jember geography
      const geoNotes: Record<string, string> = {
        'Silo': 'Kecamatan pegunungan berbatasan dengan Banyuwangi. Jalur lintas selatan berpotensi tinggi untuk canvassing warung peristirahatan supir logistik.',
        'Tempurejo': 'Dekat dengan wilayah Taman Nasional Meru Betiri. Potensi perkebunan besar. Targetkan warung-warung dekat area pemukiman pekerja perkebunan.',
        'Sumberjambe': 'Wilayah utara lereng Gunung Raung. Karakter konsumen menyukai produk rokok dengan rasa mantap. Sangat cocok untuk penetrasi Makayasa.',
        'Jelbuk': 'Wilayah perbukitan utara Jember arah Bondowoso. Jalur provinsi ramai kendaraan. Canvassing toko-toko pinggir jalan raya utama.',
        'Panti': 'Area lereng pegunungan Argopuro. Fokus pada toko ritel di dekat pasar tradisional Panti.',
        'Sukorambi': 'Daerah penyangga perkotaan. Sangat berdekatan dengan Kaliwates. Cocok untuk canvassing toko kelontong padat penduduk.',
        'Jombang': 'Bagian barat Jember dekat Lumajang. Sektor pertanian subur. Potensi besar di warung kopi tempat berkumpulnya para petani.',
        'Ledokombo': 'Kecamatan di timur Jember dengan aktivitas ekonomi pasar lokal yang dinamis. Targetkan warung di dekat pusat keramaian desa.'
      };
      
      return {
        strategy: 'OPERASI CANVASSING & PENETRASI BARU',
        notes: geoNotes[kecName] || `Wilayah ${kecName} belum terjamah oleh tim sales Makayasa. Ini adalah "Blank Spot" yang menyimpan potensi pertumbuhan tak terbatas. Diperlukan ekspedisi canvassing awal untuk memetakan minimal 5 outlet potensial perdana.`,
        targetOutlet: 'Kirim tim Sales untuk pemetaan area pasar tradisional dan persimpangan jalan utama.'
      };
  }
};

export default function WilayahArea({ transactions }: WilayahAreaProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'high' | 'medium' | 'untouched'>('all');
  const [sortBy, setSortBy] = useState<'alphabet' | 'volume' | 'outlets' | 'status'>('status');
  const [selectedKec, setSelectedKec] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'desa' | 'outlets'>('desa');

  // Reset tab to "desa" when selecting a different kecamatan
  React.useEffect(() => {
    setDetailTab('desa');
  }, [selectedKec]);

  // Parse and aggregate data for all 31 Kecamatan
  const kecamatanData = useMemo(() => {
    // Initialize data for all 31 kecamatan
    const map: Record<string, {
      name: string;
      totalPacks: number;
      totalOmset: number;
      stores: Set<string>;
      salesPICs: Set<string>;
      transactions: Transaction[];
      desaStats: Record<string, {
        name: string;
        totalPacks: number;
        totalOmset: number;
        stores: Set<string>;
      }>;
    }> = {};

    JEMBER_KECAMATAN.forEach(kec => {
      map[kec] = {
        name: kec,
        totalPacks: 0,
        totalOmset: 0,
        stores: new Set<string>(),
        salesPICs: new Set<string>(),
        transactions: [],
        desaStats: {}
      };
    });

    // Populate data from transactions
    transactions.forEach(tx => {
      const kec = getKecamatanForTransaction(tx);
      if (kec && map[kec]) {
        map[kec].totalPacks += tx.qtyPacks;
        map[kec].totalOmset += tx.omset;
        if (tx.storeName && tx.storeName !== 'Toko Umum') {
          map[kec].stores.add(tx.storeName);
        }
        if (tx.salesName && tx.salesName !== 'Sales Tak Dikenal') {
          map[kec].salesPICs.add(tx.salesName);
        }
        map[kec].transactions.push(tx);

        // Group by Desa
        const desaName = getDesaForTransaction(tx, kec);
        if (!map[kec].desaStats[desaName]) {
          map[kec].desaStats[desaName] = {
            name: desaName,
            totalPacks: 0,
            totalOmset: 0,
            stores: new Set<string>()
          };
        }
        map[kec].desaStats[desaName].totalPacks += tx.qtyPacks;
        map[kec].desaStats[desaName].totalOmset += tx.omset;
        if (tx.storeName && tx.storeName !== 'Toko Umum') {
          map[kec].desaStats[desaName].stores.add(tx.storeName);
        }
      }
    });

    // Convert map to array and compute final metrics
    return JEMBER_KECAMATAN.map(kec => {
      const data = map[kec];
      const storeCount = data.stores.size;
      const packs = data.totalPacks;
      
      let status: 'HIGH' | 'MEDIUM' | 'UNTOUCHED' = 'UNTOUCHED';
      if (packs > 100 || storeCount > 3) {
        status = 'HIGH';
      } else if (packs > 0 || storeCount > 0) {
        status = 'MEDIUM';
      }

      // Convert desa statistics to list
      const activeDesas = Object.values(data.desaStats).map(d => ({
        name: d.name,
        totalPacks: d.totalPacks,
        totalOmset: d.totalOmset,
        storeCount: d.stores.size,
        stores: Array.from(d.stores)
      })).sort((a, b) => b.totalPacks - a.totalPacks);

      // Find Blank Spot villages (canonical villages with no sales)
      const canonicalVillages = KECAMATAN_VILLAGES[kec] || [];
      const blankSpotDesas = canonicalVillages.filter(vName => {
        const isActive = activeDesas.some(ad => ad.name.toLowerCase() === vName.toLowerCase());
        return !isActive;
      });

      return {
        name: kec,
        totalPacks: packs,
        totalOmset: data.totalOmset,
        storeCount,
        stores: Array.from(data.stores),
        salesPICs: Array.from(data.salesPICs),
        recentTransactions: data.transactions.slice(0, 5),
        status,
        activeDesas,
        blankSpotDesas,
        tactical: getTacticalNotes(kec, status, storeCount, packs)
      };
    });
  }, [transactions]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = 31;
    const high = kecamatanData.filter(k => k.status === 'HIGH').length;
    const medium = kecamatanData.filter(k => k.status === 'MEDIUM').length;
    const untouched = kecamatanData.filter(k => k.status === 'UNTOUCHED').length;
    const activeKecCount = total - untouched;
    const penetrationRate = (activeKecCount / total) * 100;
    
    // Find top selling district
    const sortedBySales = [...kecamatanData].sort((a, b) => b.totalPacks - a.totalPacks);
    const topDistrict = sortedBySales[0]?.totalPacks > 0 ? sortedBySales[0] : null;

    return {
      total,
      high,
      medium,
      untouched,
      activeKecCount,
      penetrationRate,
      topDistrict
    };
  }, [kecamatanData]);

  // Filter & Sort Kecamatan list
  const filteredAndSortedKec = useMemo(() => {
    let result = kecamatanData.filter(kec => {
      // 1. Search Query
      const matchesSearch = kec.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Status Filter
      if (statusFilter === 'all') return matchesSearch;
      return matchesSearch && kec.status.toLowerCase() === statusFilter;
    });

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === 'alphabet') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'volume') {
        return b.totalPacks - a.totalPacks;
      }
      if (sortBy === 'outlets') {
        return b.storeCount - a.storeCount;
      }
      if (sortBy === 'status') {
        const priority = { 'HIGH': 3, 'MEDIUM': 2, 'UNTOUCHED': 1 };
        const scoreA = priority[a.status];
        const scoreB = priority[b.status];
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.totalPacks - a.totalPacks; // sub-sort by volume
      }
      return 0;
    });

    return result;
  }, [kecamatanData, searchQuery, statusFilter, sortBy]);

  const selectedKecData = useMemo(() => {
    if (!selectedKec) return null;
    return kecamatanData.find(k => k.name === selectedKec) || null;
  }, [selectedKec, kecamatanData]);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center pointer-events-none mr-4">
          <Map className="w-64 h-64 rotate-12 text-amber-500" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider w-fit">
            <Compass className="w-3.5 h-3.5 animate-spin-slow text-amber-400" />
            Evaluasi Wilayah Terintegrasi Jember
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
            Pemetaan & Evaluasi Area Penjualan Rokok
          </h2>
          
          <p className="text-sm text-slate-300 font-normal max-w-3xl leading-relaxed">
            Sistem pengawasan wilayah terintegrasi untuk memudahkan Komandan memantau penetrasi pasar di <strong className="text-amber-400">31 Kecamatan Kabupaten Jember</strong>. Identifikasi area potensial berkinerja tinggi, pantau outlet aktif, dan buat tindakan taktis langsung untuk wilayah yang belum terjamah (Blank Spot).
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rasio Penetrasi</p>
                <p className="text-lg font-black text-white">{stats.penetrationRate.toFixed(1)}% <span className="text-xs font-semibold text-slate-400">({stats.activeKecCount}/31 Kec)</span></p>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Penetrasi Tinggi</p>
                <p className="text-lg font-black text-white">{stats.high} <span className="text-xs font-semibold text-slate-400">Kecamatan</span></p>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Compass className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Penetrasi Sedang</p>
                <p className="text-lg font-black text-white">{stats.medium} <span className="text-xs font-semibold text-slate-400">Kecamatan</span></p>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Belum Masuk (Blank Spot)</p>
                <p className="text-lg font-black text-rose-400">{stats.untouched} <span className="text-xs font-semibold text-rose-300">Kecamatan</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TACTICAL BRIEF FOR COMMANDER */}
      {stats.untouched > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 text-amber-900 dark:text-amber-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Zap className="w-6 h-6 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-sm font-black uppercase tracking-wide">Panggilan Tugas Canvassing Komandan</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Terdapat <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{stats.untouched} Kecamatan Blank Spot</strong> di Jember yang belum menghasilkan transaksi. Kirimkan tim sales Anda ke wilayah seperti <strong className="text-slate-900 dark:text-white font-extrabold">{kecamatanData.filter(k => k.status === 'UNTOUCHED').slice(0, 3).map(k => k.name).join(', ')}</strong> untuk memperluas jangkauan pasar dan menaikkan omset usaha!
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setStatusFilter('untouched');
              setSelectedKec(null);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md active:scale-95 shrink-0"
          >
            Filter Blank Spot ({stats.untouched})
          </button>
        </div>
      )}

      {/* FILTER & CONTROL PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Left side: Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari nama Kecamatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Filter subtabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full sm:w-auto overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-850 text-slate-900 dark:text-white shadow-sm font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua (31)
            </button>
            <button
              onClick={() => setStatusFilter('high')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'high'
                  ? 'bg-emerald-500 text-white shadow-sm font-extrabold'
                  : 'text-emerald-600 hover:bg-emerald-50/30'
              }`}
            >
              🟢 Tinggi ({stats.high})
            </button>
            <button
              onClick={() => setStatusFilter('medium')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'medium'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-amber-500 hover:bg-amber-50/30'
              }`}
            >
              🟡 Sedang ({stats.medium})
            </button>
            <button
              onClick={() => setStatusFilter('untouched')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'untouched'
                  ? 'bg-rose-500 text-white shadow-sm font-extrabold'
                  : 'text-rose-600 hover:bg-rose-50/30'
              }`}
            >
              🔴 Blank Spot ({stats.untouched})
            </button>
          </div>
        </div>

        {/* Right side: Sorting controls */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Urutkan:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 appearance-none cursor-pointer"
          >
            <option value="status">Status & Volume Terbanyak</option>
            <option value="alphabet">Nama Abjad A - Z</option>
            <option value="volume">Volume Terbanyak (Pack)</option>
            <option value="outlets">Jumlah Outlet Terbanyak</option>
          </select>
        </div>

      </div>

      {/* CORE TWO-COLUMN MAIN VIEW (Grid layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: 31 KECAMATAN GRID (Responsive tablet, mobile, desktop card layout) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredAndSortedKec.map((kec) => {
              const isSelected = selectedKec === kec.name;
              
              // Status Styling
              const statusColorMap = {
                HIGH: {
                  bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50',
                  badge: 'bg-emerald-500 text-white',
                  text: 'text-emerald-700 dark:text-emerald-400',
                  indicator: 'bg-emerald-500'
                },
                MEDIUM: {
                  bg: 'bg-amber-50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30',
                  badge: 'bg-amber-500 text-slate-950',
                  text: 'text-amber-800 dark:text-amber-400',
                  indicator: 'bg-amber-500'
                },
                UNTOUCHED: {
                  bg: 'bg-rose-50/40 dark:bg-rose-950/5 border-rose-100/50 dark:border-rose-950/30',
                  badge: 'bg-rose-500 text-white',
                  text: 'text-rose-700 dark:text-rose-400',
                  indicator: 'bg-rose-500'
                }
              };
              
              const style = statusColorMap[kec.status];

              return (
                <motion.div
                  layoutId={`kec-card-${kec.name}`}
                  key={kec.name}
                  onClick={() => setSelectedKec(kec.name)}
                  className={`
                    p-4 rounded-2xl border transition-all duration-200 text-left cursor-pointer relative overflow-hidden group hover:scale-[1.02] hover:shadow-md
                    ${isSelected ? 'ring-2 ring-amber-500 bg-white dark:bg-slate-900 border-transparent shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850'}
                  `}
                >
                  {/* Status indicator pill top-right */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${style.indicator}`} />
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{kec.status}</span>
                  </div>

                  <div className="space-y-3.5 pr-14">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                        {kec.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Kabupaten Jember</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-slate-850 pt-2.5">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Volume</span>
                        <strong className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                          {kec.totalPacks} <span className="text-[10px] font-medium text-slate-400">Pack</span>
                        </strong>
                      </div>
                      
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Outlet</span>
                        <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {kec.storeCount} <span className="text-[10px] font-medium text-slate-400">Aktif</span>
                        </strong>
                      </div>
                    </div>

                    {/* Status recommendation alert block */}
                    <div className={`p-2 rounded-xl text-[10px] font-bold truncate ${style.bg} ${style.text}`}>
                      📍 {kec.tactical.strategy}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {filteredAndSortedKec.length === 0 && (
              <div className="col-span-full p-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl text-center text-slate-400">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold">Kecamatan tidak ditemukan</p>
                <p className="text-xs text-slate-400 mt-1">Coba ketik kata kunci penelusuran lainnya.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED AREA EVALUATION DRAWER / PANEL */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedKecData ? (
              <motion.div
                key={selectedKecData.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl p-6 shadow-lg space-y-6 sticky top-6"
              >
                {/* Panel Header */}
                <div className="flex items-start justify-between border-b border-slate-150 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-950 text-slate-500 font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider border border-slate-200/50">
                      Evaluasi Taktis
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                      Kecamatan {selectedKecData.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedKec(null)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-950 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

                {/* Performance indicators */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Terjual</span>
                    <strong className="text-lg font-mono font-black text-slate-800 dark:text-slate-100 mt-1 block">
                      {selectedKecData.totalPacks} <span className="text-xs font-normal text-slate-400">Pack</span>
                    </strong>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Omset</span>
                    <strong className="text-md font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 block leading-tight pt-1">
                      {formatIDR(selectedKecData.totalOmset)}
                    </strong>
                  </div>
                </div>

                {/* Commander Tactical Strategy Card */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-slate-900 dark:text-slate-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Target className="w-5 h-5 text-amber-500 shrink-0" />
                    <h5 className="text-xs font-black uppercase tracking-wider">INSTRUKSI TAKTIS KOMANDAN</h5>
                  </div>
                  <p className="text-xs font-bold leading-relaxed">{selectedKecData.tactical.strategy}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{selectedKecData.tactical.notes}</p>
                  
                  <div className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-amber-500/25">
                    <p className="text-[10px] text-amber-500 font-black uppercase tracking-wider">Rekomendasi Aksi:</p>
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedKecData.tactical.targetOutlet}</p>
                  </div>
                </div>

                {/* List of active sales in this area */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" /> SALES AKTIF DI AREA
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedKecData.salesPICs.length > 0 ? (
                      selectedKecData.salesPICs.map(sales => (
                        <span key={sales} className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 font-extrabold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
                          {sales}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Belum ada sales mendaftar transaksi</span>
                    )}
                  </div>
                </div>

                {/* DUAL-TAB FOR VILLAGES AND OUTLETS */}
                <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {/* Tab Headers */}
                  <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl">
                    <button
                      onClick={() => setDetailTab('desa')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        detailTab === 'desa'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      🗺️ Evaluasi Desa ({selectedKecData.activeDesas.length})
                    </button>
                    <button
                      onClick={() => setDetailTab('outlets')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        detailTab === 'outlets'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      🏪 Daftar Outlet ({selectedKecData.storeCount})
                    </button>
                  </div>

                  {/* TAB 1: DESA EVALUATION */}
                  {detailTab === 'desa' && (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Active Villages with Sales */}
                      <div className="space-y-2.5">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          DESA / KELURAHAN AKTIF PENJUALAN
                        </h5>
                        <div className="max-h-52 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                          {selectedKecData.activeDesas.length > 0 ? (
                            selectedKecData.activeDesas.map(desa => {
                              const pct = Math.min(100, (desa.totalPacks / (selectedKecData.totalPacks || 1)) * 100);
                              return (
                                <div key={desa.name} className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
                                  <div className="flex justify-between items-start mb-1.5">
                                    <div>
                                      <h6 className="text-xs font-black text-slate-800 dark:text-slate-200">
                                        Desa {desa.name}
                                      </h6>
                                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                                        {desa.storeCount} outlet terdaftar
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-black text-slate-900 dark:text-white font-mono block">
                                        {desa.totalPacks} Pack
                                      </span>
                                      <span className="text-[10px] text-emerald-600 font-bold font-mono">
                                        {formatIDR(desa.totalOmset)}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 italic">
                              Belum ada desa yang terdata melakukan transaksi penjualan.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Village Blank Spots (Untouched Villages in this District) */}
                      {selectedKecData.blankSpotDesas.length > 0 && (
                        <div className="space-y-2 pt-1.5 border-t border-slate-100 dark:border-slate-850">
                          <div className="flex items-center gap-1.5 text-rose-500">
                            <AlertTriangle className="w-4 h-4" />
                            <h5 className="text-[10px] font-black uppercase tracking-widest">
                              BLANK SPOT DESA (POTENSI BARU)
                            </h5>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                            Desa-desa besar di Kecamatan {selectedKecData.name} berikut belum terjamah transaksi. Targetkan canvassing berikutnya ke sini!
                          </p>
                          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 py-1 custom-scrollbar">
                            {selectedKecData.blankSpotDesas.map(vName => (
                              <span 
                                key={vName} 
                                className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1.5 shadow-xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                Desa {vName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: OUTLET LIST */}
                  {detailTab === 'outlets' && (
                    <div className="space-y-3 animate-fadeIn">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        DAFTAR OUTLET DI AREA
                      </h5>
                      <div className="max-h-80 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                        {selectedKecData.stores.length > 0 ? (
                          selectedKecData.stores.map(storeName => (
                            <div key={storeName} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 shadow-xs hover:border-slate-200 transition-colors">
                              <span className="truncate">{storeName}</span>
                              <span className="text-[10px] text-amber-500 uppercase font-bold shrink-0">AKTIF</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 italic">
                            Tidak ada outlet terdaftar. Hubungi sales untuk canvassing pertama!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </motion.div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-900 rounded-3xl p-8 text-center text-slate-400 border-dashed space-y-3 flex flex-col items-center justify-center min-h-[300px]">
                <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-800 animate-bounce" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-400">Pilih Kecamatan Untuk Evaluasi</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Pilihlah salah satu dari 31 Kecamatan Jember di samping kiri untuk mengawasi rincian kinerja sales, daftar outlet aktif, dan instruksi penugasan taktis.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
