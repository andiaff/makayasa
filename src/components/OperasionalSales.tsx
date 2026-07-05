/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Coins, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Info, 
  Calendar, 
  User, 
  Settings, 
  Wallet, 
  BarChart4, 
  ListOrdered,
  AlertTriangle,
  ArrowRight
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
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Transaction } from '../types';
import { formatIDR } from '../utils/spreadsheetParser';

// Helper to determine the week label and start/end dates
const getWeekRange = (date: Date): { start: Date; end: Date; label: string; weekKey: string } => {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday is first day of the week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 5); // 6 working days (Mon-Sat)
  end.setHours(23, 59, 59, 999);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const startStr = `${start.getDate()} ${months[start.getMonth()]}`;
  const endStr = `${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
  
  const weekNum = Math.ceil(start.getDate() / 7);
  const label = `Minggu ke-${weekNum} (${startStr} - ${endStr})`;
  const weekKey = `${start.getFullYear()}-W${Math.floor(start.getTime() / (7 * 24 * 60 * 60 * 1000))}`;

  return { start, end, label, weekKey };
};

interface OperasionalSalesProps {
  transactions: Transaction[];
  salesNames?: string[];
}

export default function OperasionalSales({ transactions, salesNames }: OperasionalSalesProps) {
  // --- CONFIGURABLE PARAMETERS ---
  const [targetSelop, setTargetSelop] = useState<number>(18); // 18 selop per week
  const [standardAllowance, setStandardAllowance] = useState<number>(250000); // Rp 250,000 per week
  const [packsPerSelop, setPacksPerSelop] = useState<number>(10); // 10 packs per selop
  const [payoutPolicy, setPayoutPolicy] = useState<'strict' | 'proportional'>('proportional');
  const [floorPercentage, setFloorPercentage] = useState<number>(0); // Min percentage payout if not met
  const [viewTab, setViewTab] = useState<'cumulative' | 'weekly'>('weekly'); // Default to weekly breakdown for accurate evaluation
  const [selectedSalesFilter, setSelectedSalesFilter] = useState<string>('all');

  // List of active sales names
  const activeSales = useMemo(() => {
    if (salesNames && salesNames.length > 0) return salesNames;
    return Array.from(new Set(transactions.map(tx => tx.salesName).filter(name => name && name !== 'Sales Tak Dikenal')));
  }, [transactions, salesNames]);

  // Group transactions chronologically into weeks
  const weeklyGroupedData = useMemo(() => {
    const groups: Record<string, { label: string; start: Date; end: Date; txs: Transaction[] }> = {};
    
    // Sort transactions chronologically
    const sortedTxs = [...transactions].sort((a, b) => a.tanggal.getTime() - b.tanggal.getTime());

    sortedTxs.forEach(tx => {
      const { label, start, end, weekKey } = getWeekRange(tx.tanggal);
      if (!groups[weekKey]) {
        groups[weekKey] = {
          label,
          start,
          end,
          txs: []
        };
      }
      groups[weekKey].txs.push(tx);
    });

    // If there are no transactions, provide a default week placeholder
    if (Object.keys(groups).length === 0) {
      const { label, start, end, weekKey } = getWeekRange(new Date());
      groups[weekKey] = {
        label,
        start,
        end,
        txs: []
      };
    }

    return Object.entries(groups)
      .map(([key, value]) => ({ weekKey: key, ...value }))
      .sort((a, b) => b.start.getTime() - a.start.getTime()); // Newest week first
  }, [transactions]);

  // Generate detailed weekly evaluations per sales
  const weeklyEvaluations = useMemo(() => {
    const evals: {
      weekLabel: string;
      weekKey: string;
      salesEvals: {
        salesName: string;
        packsSold: number;
        selopSold: number;
        achievementRate: number;
        isTargetMet: boolean;
        payoutAmount: number;
        withheldAmount: number;
        statusLabel: 'Cair Penuh' | 'Cair Sebagian' | 'Ditahan Penuh';
      }[];
    }[] = [];

    weeklyGroupedData.forEach(week => {
      const salesEvalsList = activeSales.map(salesName => {
        // Filter transactions for this sales in this week
        const salesTxs = week.txs.filter(tx => tx.salesName === salesName);
        const packsSold = salesTxs.reduce((sum, tx) => sum + tx.qtyPacks, 0);
        const selopSold = Number((packsSold / packsPerSelop).toFixed(1));
        const achievementRate = Math.min(100, Number(((selopSold / targetSelop) * 100).toFixed(1)));
        const isTargetMet = selopSold >= targetSelop;

        let payoutAmount = 0;
        let statusLabel: 'Cair Penuh' | 'Cair Sebagian' | 'Ditahan Penuh' = 'Ditahan Penuh';

        if (isTargetMet) {
          payoutAmount = standardAllowance;
          statusLabel = 'Cair Penuh';
        } else {
          if (payoutPolicy === 'strict') {
            // Either fully withheld, or paid at floor percentage
            payoutAmount = standardAllowance * (floorPercentage / 100);
            statusLabel = floorPercentage > 0 ? 'Cair Sebagian' : 'Ditahan Penuh';
          } else {
            // Proportional payout with floor
            const rateFraction = selopSold / targetSelop;
            const effectiveFraction = Math.max(floorPercentage / 100, rateFraction);
            payoutAmount = Math.round(standardAllowance * effectiveFraction);
            statusLabel = effectiveFraction > 0 ? 'Cair Sebagian' : 'Ditahan Penuh';
          }
        }

        const withheldAmount = standardAllowance - payoutAmount;

        return {
          salesName,
          packsSold,
          selopSold,
          achievementRate,
          isTargetMet,
          payoutAmount,
          withheldAmount,
          statusLabel
        };
      });

      evals.push({
        weekLabel: week.label,
        weekKey: week.weekKey,
        salesEvals: salesEvalsList
      });
    });

    return evals;
  }, [weeklyGroupedData, activeSales, targetSelop, standardAllowance, packsPerSelop, payoutPolicy, floorPercentage]);

  // Cumulative period totals per sales
  const cumulativeEvaluations = useMemo(() => {
    const map: Record<string, {
      salesName: string;
      totalPacks: number;
      totalSelop: number;
      weeksEvaluated: number;
      weeksPassedTarget: number;
      totalPayout: number;
      totalWithheld: number;
    }> = {};

    activeSales.forEach(name => {
      map[name] = {
        salesName: name,
        totalPacks: 0,
        totalSelop: 0,
        weeksEvaluated: 0,
        weeksPassedTarget: 0,
        totalPayout: 0,
        totalWithheld: 0
      };
    });

    weeklyEvaluations.forEach(week => {
      week.salesEvals.forEach(se => {
        if (!map[se.salesName]) return;
        map[se.salesName].totalPacks += se.packsSold;
        map[se.salesName].totalSelop += se.selopSold;
        map[se.salesName].weeksEvaluated += 1;
        if (se.isTargetMet) {
          map[se.salesName].weeksPassedTarget += 1;
        }
        map[se.salesName].totalPayout += se.payoutAmount;
        map[se.salesName].totalWithheld += se.withheldAmount;
      });
    });

    return Object.values(map);
  }, [weeklyEvaluations, activeSales]);

  // Overall statistics for KPI block
  const statsSummary = useMemo(() => {
    let totalPayout = 0;
    let totalWithheld = 0;
    let totalWeeksEvaluated = 0;
    let targetMetCount = 0;

    weeklyEvaluations.forEach(week => {
      week.salesEvals.forEach(se => {
        totalPayout += se.payoutAmount;
        totalWithheld += se.withheldAmount;
        totalWeeksEvaluated += 1;
        if (se.isTargetMet) {
          targetMetCount += 1;
        }
      });
    });

    const successRate = totalWeeksEvaluated > 0 ? (targetMetCount / totalWeeksEvaluated) * 100 : 0;
    const totalPotentialBudget = totalPayout + totalWithheld;
    const savingRate = totalPotentialBudget > 0 ? (totalWithheld / totalPotentialBudget) * 100 : 0;

    return {
      totalPayout,
      totalWithheld,
      successRate,
      savingRate,
      targetMetCount,
      totalWeeksEvaluated,
      totalPotentialBudget
    };
  }, [weeklyEvaluations]);

  // Chart data: Payout vs Withheld per Sales
  const chartDataPayoutWithheld = useMemo(() => {
    return cumulativeEvaluations.map(e => ({
      name: e.salesName,
      'Cair (Disbursed)': e.totalPayout,
      'Ditahan (Withheld)': e.totalWithheld,
    }));
  }, [cumulativeEvaluations]);

  // Chart data: Average Achievement per sales
  const chartDataAchievement = useMemo(() => {
    return cumulativeEvaluations.map(e => {
      const avgSelop = e.weeksEvaluated > 0 ? Number((e.totalSelop / e.weeksEvaluated).toFixed(1)) : 0;
      return {
        name: e.salesName,
        'Rata-Rata Selop / Minggu': avgSelop,
        'Target': targetSelop
      };
    });
  }, [cumulativeEvaluations, targetSelop]);

  return (
    <div id="operasional_sales_view" className="space-y-6">
      
      {/* 1. Header Information Panel */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-400 font-extrabold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase border border-amber-500/30">
              <Coins className="w-3.5 h-3.5 animate-pulse" />
              Sistem Evaluasi Operasional
            </span>
            <h3 className="text-xl font-black tracking-tight text-white">Evaluasi & Pengawasan Operasional Sales</h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Pantau kepatuhan target <strong>{targetSelop} Selop</strong> (atau {targetSelop * packsPerSelop} Pack) per 6 hari kerja/minggu. Sistem otomatis memotong atau menahan uang operasional harian/mingguan secara objektif berdasarkan data lapangan real-time.
            </p>
          </div>
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 shrink-0 flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 rounded-xl text-slate-950 font-black">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Uang Operasional Base</p>
              <h4 className="text-lg font-black text-white font-mono">{formatIDR(standardAllowance)} <span className="text-[10px] font-medium text-slate-400">/Minggu</span></h4>
            </div>
          </div>
        </div>
      </div>

      {/* ALERT INFO: Hubungan Sorter Global & Target Mingguan */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-5 flex gap-4 items-start animate-fadeIn">
        <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-800 shrink-0 border border-indigo-200">
          <Info className="w-5 h-5 text-indigo-700" />
        </div>
        <div className="space-y-1.5">
          <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">💡 Cara Membaca & Hubungan Filter Sorter Global</h4>
          <p className="text-xs text-indigo-900 leading-relaxed font-semibold">
            Sistem evaluasi di bawah ini didesain berdasarkan <strong>siklus mingguan (target per minggu)</strong>. 
            Jika Anda mengeklik menu filter di bagian atas (seperti <em>Hari Ini</em>, <em>Kemarin</em>, atau memilih tanggal spesifik tertentu di <em>Rentang Manual</em>), maka tabel evaluasi di bawah hanya akan menghitung penjualan yang terjadi pada hari/tanggal yang difilter tersebut.
          </p>
          <div className="text-xs text-indigo-800/90 leading-relaxed font-medium space-y-1 bg-white/60 p-3 rounded-2xl border border-indigo-100/80 mt-1">
            <p>📌 <strong>Contoh Kasus:</strong> Jika Anda memfilter tanggal 21 Juni saja, sistem hanya akan membaca data tanggal 21 Juni. Meskipun sales sebenarnya telah menjual banyak di hari lain dalam minggu yang sama, sistem hanya melihat penjualan di tanggal 21 Juni saja (misalnya 2 Selop). Akibatnya, pencapaian target di bawah akan bertuliskan <span className="text-rose-600 font-extrabold">Target Gagal</span> karena volume 2 Selop tersebut belum memenuhi target mingguan (18 Selop).</p>
            <p>👉 <strong>Rekomendasi Komandan:</strong> Untuk melihat hasil evaluasi mingguan yang valid secara utuh, setel filter atas ke <strong>Perminggu</strong>, <strong>Perbulan (30 Hari)</strong>, atau pilih <strong>Rentang Manual</strong> yang mencakup satu minggu penuh (Senin s/d Sabtu).</p>
          </div>
        </div>
      </div>

      {/* 2. Interactive Controls & Settings Slider */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Simulator Parameters */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="w-5 h-5 text-indigo-600" />
            <div>
              <h4 className="text-xs font-black uppercase text-slate-950 tracking-wider">Aturan Operasional</h4>
              <p className="text-[10px] text-slate-400 font-medium">Ubah kriteria pencairan uang operasional</p>
            </div>
          </div>

          {/* Target Selop Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-extrabold text-slate-700">Target Volume per Minggu:</label>
              <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                {targetSelop} Selop ({targetSelop * packsPerSelop} Pack)
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={targetSelop}
              onChange={(e) => setTargetSelop(Number(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Allowance Amount Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-extrabold text-slate-700">Uang Operasional Standard:</label>
              <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                {formatIDR(standardAllowance)}
              </span>
            </div>
            <input
              type="range"
              min="100000"
              max="500000"
              step="10000"
              value={standardAllowance}
              onChange={(e) => setStandardAllowance(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Packs Per Selop Conversion Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-extrabold text-slate-700">Konversi (Pack per Selop):</label>
              <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-mono">
                1 Selop = {packsPerSelop} Pack
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="20"
              step="1"
              value={packsPerSelop}
              onChange={(e) => setPacksPerSelop(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Floor Payout Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-extrabold text-slate-700">Batas Minimal Payout (Floor):</label>
              <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-mono">
                {floorPercentage}% ({formatIDR(standardAllowance * (floorPercentage / 100))})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={floorPercentage}
              onChange={(e) => setFloorPercentage(Number(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[9px] text-slate-400 font-medium italic">Sisa uang terkecil yang tetap keluar meskipun performa buruk.</p>
          </div>

          {/* Policy Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-extrabold text-slate-700 block">Kebijakan Pemotongan Jika Target Gagal:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayoutPolicy('proportional')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all border text-center ${
                  payoutPolicy === 'proportional'
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Proporsional (%)
              </button>
              <button
                type="button"
                onClick={() => setPayoutPolicy('strict')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all border text-center ${
                  payoutPolicy === 'strict'
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Ditahan Penuh
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              {payoutPolicy === 'proportional' 
                ? '💡 Proporsional: Uang operasional cair senilai % pencapaian target selop (floored).' 
                : '💡 Ditahan Penuh: Jika kurang dari 18 selop, uang operasional ditahan penuh (0% / hanya sisa floor).'}
            </p>
          </div>
        </div>

        {/* 4 Block KPIs Summary */}
        <div className="lg:col-span-2 grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
          
          {/* Card 1: Total Budget Disbursed */}
          <div className="bg-white rounded-3xl p-3.5 xs:p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] xs:text-[10px] uppercase font-black text-slate-400 tracking-wider">Disalurkan (Cair)</span>
              <div className="w-7 h-7 xs:w-8 xs:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs xs:text-sm shrink-0">
                ✓
              </div>
            </div>
            <div className="mt-3 xs:mt-4">
              <h3 className="text-base xs:text-lg sm:text-xl lg:text-2xl font-black text-slate-900 font-mono tracking-tight break-all">{formatIDR(statsSummary.totalPayout)}</h3>
              <p className="text-[9px] xs:text-[10px] text-slate-500 font-semibold mt-1 leading-tight">Uang operasional yang telah dicairkan ke sales</p>
            </div>
          </div>

          {/* Card 2: Total Budget Withheld (Savings) */}
          <div className="bg-white rounded-3xl p-3.5 xs:p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] xs:text-[10px] uppercase font-black text-slate-400 tracking-wider">Ditahan (Efisiensi Komandan)</span>
              <div className="w-7 h-7 xs:w-8 xs:h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs xs:text-sm shrink-0">
                ✕
              </div>
            </div>
            <div className="mt-3 xs:mt-4">
              <h3 className="text-base xs:text-lg sm:text-xl lg:text-2xl font-black text-rose-600 font-mono tracking-tight break-all">{formatIDR(statsSummary.totalWithheld)}</h3>
              <p className="text-[9px] xs:text-[10px] text-slate-500 font-semibold mt-1 leading-tight">Sisa dana ditahan/hemat karena tidak capai target</p>
            </div>
          </div>

          {/* Card 3: Target Success Rate */}
          <div className="bg-white rounded-3xl p-3.5 xs:p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] xs:text-[10px] uppercase font-black text-slate-400 tracking-wider">Rasio Sukses Target</span>
              <div className="w-7 h-7 xs:w-8 xs:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs xs:text-sm shrink-0">
                %
              </div>
            </div>
            <div className="mt-3 xs:mt-4">
              <h3 className="text-base xs:text-lg sm:text-xl lg:text-2xl font-black text-indigo-600 font-mono tracking-tight">{statsSummary.successRate.toFixed(1)}%</h3>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${statsSummary.successRate}%` }} />
              </div>
              <p className="text-[9px] xs:text-[10px] text-slate-500 font-semibold mt-1.5 leading-tight">
                {statsSummary.targetMetCount} dari {statsSummary.totalWeeksEvaluated} target mingguan terpenuhi
              </p>
            </div>
          </div>

          {/* Card 4: Saving Rate for Komandan */}
          <div className="bg-white rounded-3xl p-3.5 xs:p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] xs:text-[10px] uppercase font-black text-slate-400 tracking-wider">Persentase Efisiensi</span>
              <div className="w-7 h-7 xs:w-8 xs:h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs xs:text-sm shrink-0">
                💰
              </div>
            </div>
            <div className="mt-3 xs:mt-4">
              <h3 className="text-base xs:text-lg sm:text-xl lg:text-2xl font-black text-amber-600 font-mono tracking-tight">{statsSummary.savingRate.toFixed(1)}%</h3>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${statsSummary.savingRate}%` }} />
              </div>
              <p className="text-[9px] xs:text-[10px] text-slate-500 font-semibold mt-1.5 leading-tight">Persentase anggaran operasional yang berhasil dihemat</p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Payout vs Withheld */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart4 className="w-4 h-4 text-emerald-500" />
              <span>Peta Distribusi Anggaran Operasional</span>
            </h4>
            <p className="text-xs text-slate-500">Anggaran yang dicairkan vs ditahan per sales dalam periode aktif</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDataPayoutWithheld}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp ${val / 1000}k`} />
                <Tooltip 
                  formatter={(value: any) => [formatIDR(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Cair (Disbursed)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ditahan (Withheld)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average Selop Achievement */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              <span>Rata-Rata Pencapaian Selop Sales</span>
            </h4>
            <p className="text-xs text-slate-500">Bandingan performa mingguan sales dengan Target {targetSelop} Selop</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDataAchievement}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Selop', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: '10px' } }} />
                <Tooltip 
                  formatter={(value: any, name: string) => [`${value} Selop`, name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Rata-Rata Selop / Minggu" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {chartDataAchievement.map((entry, index) => {
                    const isMet = entry['Rata-Rata Selop / Minggu'] >= targetSelop;
                    return <Cell key={`cell-${index}`} fill={isMet ? '#6366f1' : '#f59e0b'} />;
                  })}
                </Bar>
                <Bar dataKey="Target" fill="#cbd5e1" radius={[2, 2, 0, 0]} maxBarSize={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. Tab Selector & Detailed Evaluation Grid */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Tab Headers and Filter */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 text-indigo-700 p-2 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Lembar Evaluasi Operasional</h4>
              <p className="text-xs text-slate-500">Klik tab di bawah untuk beralih mode visualisasi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewTab('weekly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewTab === 'weekly'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              🗓 Detail Mingguan
            </button>
            <button
              onClick={() => setViewTab('cumulative')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewTab === 'cumulative'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              👥 Akumulasi Periode
            </button>
          </div>
        </div>

        {/* View 1: Weekly Breakdown (Highly detailed and requested) */}
        {viewTab === 'weekly' && (
          <div className="p-6 space-y-8">
            {weeklyEvaluations.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <p className="text-sm font-bold">Tidak ada data transaksi di minggu ini</p>
                <p className="text-xs mt-1">Gunakan filter tanggal di bagian atas untuk memperluas pencarian data.</p>
              </div>
            ) : (
              weeklyEvaluations.map((week, weekIdx) => (
                <div key={week.weekKey} className="space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-amber-500 rounded-full" />
                    <h5 className="text-sm font-black text-slate-900">{week.weekLabel}</h5>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                      {week.salesEvals.length} sales dievaluasi
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-2xl w-full">
                    <table className="w-full min-w-[800px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                          <th className="p-4">Nama Sales</th>
                          <th className="p-4 text-center">Volume (Pack)</th>
                          <th className="p-4 text-center">Pencapaian (Selop)</th>
                          <th className="p-4 text-center">Rasio Target ({targetSelop} Selop)</th>
                          <th className="p-4 text-center">Status Capaian</th>
                          <th className="p-4 text-right">Uang Operasional Cair</th>
                          <th className="p-4 text-right">Ditahan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                        {week.salesEvals.map(se => {
                          return (
                            <tr key={se.salesName} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                                  {se.salesName.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="font-extrabold text-slate-900">{se.salesName}</span>
                              </td>
                              <td className="p-4 text-center font-mono font-bold text-slate-500">
                                {se.packsSold} Pack
                              </td>
                              <td className="p-4 text-center font-mono font-bold text-indigo-600">
                                {se.selopSold} Selop
                              </td>
                              <td className="p-4">
                                <div className="space-y-1 max-w-[120px] mx-auto">
                                  <div className="flex justify-between text-[10px] font-mono">
                                    <span>{se.achievementRate}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${se.isTargetMet ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                      style={{ width: `${se.achievementRate}%` }} 
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                {se.isTargetMet ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-100 shadow-sm">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Target Tercapai
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-rose-100 shadow-sm">
                                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> Target Gagal
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right font-mono font-black text-emerald-600">
                                {formatIDR(se.payoutAmount)}
                                {se.statusLabel === 'Cair Penuh' && (
                                  <span className="text-[9px] block text-emerald-500 font-extrabold font-sans uppercase mt-0.5">Cair Penuh</span>
                                )}
                                {se.statusLabel === 'Cair Sebagian' && (
                                  <span className="text-[9px] block text-amber-500 font-extrabold font-sans uppercase mt-0.5">Sebagian ({Math.round((se.payoutAmount / standardAllowance) * 100)}%)</span>
                                )}
                                {se.statusLabel === 'Ditahan Penuh' && (
                                  <span className="text-[9px] block text-rose-500 font-extrabold font-sans uppercase mt-0.5">Ditahan ({se.payoutAmount === 0 ? '0%' : 'Floor Only'})</span>
                                )}
                              </td>
                              <td className="p-4 text-right font-mono font-bold text-slate-400">
                                {se.withheldAmount > 0 ? (
                                  <span className="text-rose-500 font-black">{formatIDR(se.withheldAmount)}</span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* View 2: Cumulative period aggregates */}
        {viewTab === 'cumulative' && (
          <div className="p-6">
            <div className="overflow-x-auto border border-slate-100 rounded-2xl w-full">
              <table className="w-full min-w-[800px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-wider">
                    <th className="p-4">Nama Sales</th>
                    <th className="p-4 text-center">Banyak Minggu Dievaluasi</th>
                    <th className="p-4 text-center">Minggu Sukses Target</th>
                    <th className="p-4 text-center">Total Penjualan (Selop)</th>
                    <th className="p-4 text-right">Potensi Anggaran Operasional</th>
                    <th className="p-4 text-right">Total Anggaran Cair</th>
                    <th className="p-4 text-right">Total Hemat (Ditahan)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {cumulativeEvaluations.map(e => {
                    const successWeeksRate = e.weeksEvaluated > 0 ? (e.weeksPassedTarget / e.weeksEvaluated) * 100 : 0;
                    const potentialBudget = e.weeksEvaluated * standardAllowance;
                    return (
                      <tr key={e.salesName} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                            {e.salesName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-extrabold text-slate-900">{e.salesName}</span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-500">
                          {e.weeksEvaluated} Minggu
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono font-extrabold text-indigo-600">{e.weeksPassedTarget} / {e.weeksEvaluated} Kali</span>
                            <span className="text-[10px] text-slate-400 font-semibold">({successWeeksRate.toFixed(0)}% Sukses)</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-800">
                          {e.totalSelop} Selop
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-500">
                          {formatIDR(potentialBudget)}
                        </td>
                        <td className="p-4 text-right font-mono font-black text-emerald-600">
                          {formatIDR(e.totalPayout)}
                        </td>
                        <td className="p-4 text-right font-mono font-black text-rose-600">
                          {e.totalWithheld > 0 ? formatIDR(e.totalWithheld) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* 5. Policy Guidelines Card */}
      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200 flex gap-4 items-start">
        <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-800 shrink-0 border border-amber-200">
          <Info className="w-5 h-5 text-amber-700" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">PENTING BAGI KOMANDAN & MANAJEMEN:</h4>
          <p className="text-xs text-amber-800/90 leading-relaxed font-semibold">
            Sistem evaluasi operasional ini disinkronkan secara adil dengan data spreadsheet kunjungan lapangan. Dengan memotong anggaran operasional sales yang berkinerja buruk di bawah target 18 selop, perusahaan tidak hanya menghemat biaya operasional, melainkan juga menanamkan disiplin distribusi dan kejujuran performa bagi para sales.
          </p>
          <div className="flex items-center gap-3 pt-2 text-[10px] font-extrabold text-amber-900">
            <span>✓ Aturan: 18 Selop / Minggu</span>
            <span>•</span>
            <span>✓ Operational: {formatIDR(250000)} / Minggu</span>
            <span>•</span>
            <span>✓ 1 Selop = 10 Pack Rokok</span>
          </div>
        </div>
      </div>

    </div>
  );
}
