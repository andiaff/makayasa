/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  PlusCircle, 
  RefreshCcw, 
  XCircle, 
  BarChart2, 
  ArrowRight,
  TrendingUp,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { Transaction, SalesPerformance, FilterOption } from '../types';

interface KunjunganSalesProps {
  transactions: Transaction[];
  salesNames?: string[];
  filter?: FilterOption;
}

export default function KunjunganSales({ transactions, salesNames, filter }: KunjunganSalesProps) {
  
  // Calculate target based on active filter timeframe
  let targetVisits = 25; // Default to daily target
  let targetLabel = 'Hari Ini';
  
  if (filter) {
    if (filter.type === 'today') {
      targetVisits = 25;
      targetLabel = 'Hari Ini';
    } else if (filter.type === 'yesterday') {
      targetVisits = 25;
      targetLabel = 'Kemarin';
    } else if (filter.type === 'week') {
      targetVisits = 150;
      targetLabel = 'Minggu Ini';
    } else if (filter.type === 'month') {
      targetVisits = 650;
      targetLabel = 'Bulan Ini';
    } else if (filter.type === 'range') {
      if (filter.startDate && filter.endDate) {
        const sDate = new Date(filter.startDate);
        const eDate = new Date(filter.endDate);
        const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        targetVisits = diffDays * 25;
        targetLabel = `Rentang ${diffDays} Hari`;
      } else {
        targetVisits = 25;
        targetLabel = 'Harian';
      }
    }
  } else {
    // month is default in App.tsx
    targetVisits = 650;
    targetLabel = 'Bulan Ini';
  }
  
  // Extract and calculate visit details per sales
  const getSalesVisits = (): SalesPerformance[] => {
    const activeSales = salesNames && salesNames.length > 0 
      ? salesNames 
      : Array.from(new Set(transactions.map(tx => tx.salesName).filter(name => name && name !== 'Sales Tak Dikenal')));
      
    const performanceMap: Record<string, SalesPerformance> = {};

    activeSales.forEach(name => {
      performanceMap[name] = {
        name,
        totalPacks: 0,
        totalOmset: 0,
        totalVisits: 0,
        totalOrders: 0,
        regularOrders: 0,
        repeatOrders: 0,
        noOrders: 0,
        successRate: 0
      };
    });

    transactions.forEach(tx => {
      const name = tx.salesName;
      if (!performanceMap[name]) {
        performanceMap[name] = {
          name,
          totalPacks: 0,
          totalOmset: 0,
          totalVisits: 0,
          totalOrders: 0,
          regularOrders: 0,
          repeatOrders: 0,
          noOrders: 0,
          successRate: 0
        };
      }

      performanceMap[name].totalVisits += 1;

      if (tx.statusKunjungan !== 'Tidak Order') {
        performanceMap[name].totalOrders += 1;
        performanceMap[name].totalPacks += tx.qtyPacks;
        performanceMap[name].totalOmset += tx.omset;

        if (tx.statusKunjungan === 'Baru Order' || (tx.statusKunjungan as string) === 'Order') {
          performanceMap[name].regularOrders += 1;
        } else if (tx.statusKunjungan === 'Repeat Order') {
          performanceMap[name].repeatOrders += 1;
        }
      } else {
        performanceMap[name].noOrders += 1;
      }
    });

    return Object.values(performanceMap).map(sales => {
      sales.successRate = sales.totalVisits > 0 ? (sales.totalOrders / sales.totalVisits) * 100 : 0;
      return sales;
    }).sort((a, b) => b.totalVisits - a.totalVisits); // Sort by highest visits
  };

  const salesVisits = getSalesVisits();

  // Aggregate global funnel metrics
  const totalVisits = salesVisits.reduce((acc, curr) => acc + curr.totalVisits, 0);
  const totalOrders = salesVisits.reduce((acc, curr) => acc + curr.totalOrders, 0);
  const totalRegularOrders = salesVisits.reduce((acc, curr) => acc + curr.regularOrders, 0);
  const totalRepeatOrders = salesVisits.reduce((acc, curr) => acc + curr.repeatOrders, 0);
  const totalNoOrders = salesVisits.reduce((acc, curr) => acc + curr.noOrders, 0);
  const globalSuccessRate = totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0;

  return (
    <div id="kunjungan_sales_view" className="space-y-6">
      
      {/* Visual Funnel Ringkasan Kunjungan */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-6">Ringkasan Konversi Kunjungan Global (Funneling)</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Funnel 1: Total Kunjungan Toko */}
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl relative">
            <div className="text-[10px] font-black text-slate-400 uppercase">Tahap 1: Kunjungan Toko</div>
            <h5 className="text-2xl font-black text-slate-900 mt-2 font-mono">{totalVisits} <span className="text-xs text-slate-400">Toko</span></h5>
            <p className="text-xs text-slate-500 mt-1">Total outlet yang didatangi sales</p>
            <div className="absolute right-4 bottom-4 text-slate-300">
              <MapPin className="w-8 h-8" />
            </div>
          </div>

          {/* Funnel 2: Toko Baru Order */}
          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl relative">
            <div className="text-[10px] font-black text-indigo-400 uppercase">Tahap 2: Baru Order</div>
            <h5 className="text-2xl font-black text-indigo-900 mt-2 font-mono">{totalRegularOrders} <span className="text-xs text-indigo-400">Toko</span></h5>
            <p className="text-xs text-indigo-700 font-semibold mt-1">
              Rasio Baru: {totalVisits > 0 ? ((totalRegularOrders / totalVisits) * 100).toFixed(1) : 0}%
            </p>
            <div className="absolute right-4 bottom-4 text-indigo-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>

          {/* Funnel 3: Repeat Order */}
          <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-xl relative">
            <div className="text-[10px] font-black text-sky-500 uppercase">Toko Repeat Order</div>
            <h5 className="text-2xl font-black text-sky-900 mt-2 font-mono">{totalRepeatOrders} <span className="text-xs text-sky-400">Toko</span></h5>
            <p className="text-xs text-sky-700 font-semibold mt-1">
              {totalOrders > 0 ? ((totalRepeatOrders / totalOrders) * 100).toFixed(0) : 0}% tingkat loyalitas
            </p>
            <div className="absolute right-4 bottom-4 text-sky-200">
              <RefreshCcw className="w-8 h-8" />
            </div>
          </div>

          {/* Funnel 4: Tidak Order */}
          <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl relative">
            <div className="text-[10px] font-black text-amber-500 uppercase">Toko Tidak Order</div>
            <h5 className="text-2xl font-black text-amber-900 mt-2 font-mono">{totalNoOrders} <span className="text-xs text-amber-400">Toko</span></h5>
            <p className="text-xs text-amber-700 font-semibold mt-1">
              {totalVisits > 0 ? ((totalNoOrders / totalVisits) * 100).toFixed(0) : 0}% rasio penolakan
            </p>
            <div className="absolute right-4 bottom-4 text-amber-200">
              <XCircle className="w-8 h-8" />
            </div>
          </div>

        </div>
      </div>

      {/* Grid Kunjungan per Salesperson */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900">Log & Analisis Kunjungan per Salesperson</h4>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {salesVisits.map((sales, index) => {
            // Check status colors for success rates
            let rateBg = 'bg-amber-100 text-amber-850 border-amber-200';
            if (sales.successRate >= 80) {
              rateBg = 'bg-emerald-100 text-emerald-850 border-emerald-200';
            } else if (sales.successRate >= 50) {
              rateBg = 'bg-indigo-100 text-indigo-850 border-indigo-200';
            }

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={sales.name}
                id={`visit_card_${index}`}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4"
              >
                {/* Header info */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-black text-sm">
                      {sales.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h5 className="font-extrabold text-slate-900 text-sm">{sales.name}</h5>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Performa Kunjungan</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${rateBg}`}>
                    Success Rate: {sales.successRate.toFixed(1)}%
                  </div>
                </div>

                {/* Metrics detail grids */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* Metric 1 */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Kunjungan Toko</span>
                    <strong className="text-base font-black text-slate-800 font-mono mt-1 block">{sales.totalVisits}</strong>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-indigo-50/30 p-2.5 rounded-xl border border-indigo-100/50 text-center">
                    <span className="text-[10px] text-indigo-500 font-bold uppercase block">Baru Order</span>
                    <strong className="text-base font-black text-indigo-800 font-mono mt-1 block">{sales.regularOrders}</strong>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-sky-50/30 p-2.5 rounded-xl border border-sky-100/50 text-center">
                    <span className="text-[10px] text-sky-500 font-bold uppercase block">Repeat Order</span>
                    <strong className="text-base font-black text-sky-800 font-mono mt-1 block">{sales.repeatOrders}</strong>
                  </div>

                  {/* Metric 4 */}
                  <div className="bg-amber-50/30 p-2.5 rounded-xl border border-amber-100/50 text-center">
                    <span className="text-[10px] text-amber-500 font-bold uppercase block">Tidak Order</span>
                    <strong className="text-base font-black text-amber-800 font-mono mt-1 block">{sales.noOrders}</strong>
                  </div>

                </div>

                {/* Progress Visual Target & Konversi */}
                <div className="space-y-4 pt-2">
                  {/* Target Sales Progress Indicator */}
                  {(() => {
                    const isTargetAchieved = sales.totalVisits >= targetVisits;
                    const remainingVisits = targetVisits - sales.totalVisits;
                    const targetProgressPercent = Math.min(100, (sales.totalVisits / targetVisits) * 100);
                    
                    return (
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            🎯 Progress Target Kunjungan ({targetLabel})
                          </span>
                          <span className={`font-black font-mono ${isTargetAchieved ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {sales.totalVisits} / {targetVisits} Toko
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isTargetAchieved ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${targetProgressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] pt-0.5">
                          <span className="text-slate-400 font-semibold">Target minimal {targetVisits} kunjungan / hari</span>
                          {isTargetAchieved ? (
                            <span className="text-emerald-600 font-black flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              ✓ Target Tercapai (+{sales.totalVisits - targetVisits})
                            </span>
                          ) : (
                            <span className="text-rose-600 font-black flex items-center gap-0.5 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 animate-pulse">
                              ⚠ Kurang {remainingVisits} Kunjungan
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Progress Visual bars (Komposisi Konversi Outlet) */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Komposisi Konversi Outlet:</span>
                      <span className="text-slate-700 font-bold">
                        {sales.totalOrders} Sukses / {sales.totalVisits} Kunjungan
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full flex overflow-hidden">
                      {sales.totalVisits > 0 && (
                        <>
                          <div 
                            className="bg-indigo-500 h-full" 
                            style={{ width: `${(sales.regularOrders / sales.totalVisits) * 100}%` }}
                            title={`Baru Order: ${sales.regularOrders}`}
                          />
                          <div 
                            className="bg-sky-500 h-full" 
                            style={{ width: `${(sales.repeatOrders / sales.totalVisits) * 100}%` }}
                            title={`Repeat Order: ${sales.repeatOrders}`}
                          />
                          <div 
                            className="bg-amber-500 h-full" 
                            style={{ width: `${(sales.noOrders / sales.totalVisits) * 100}%` }}
                            title={`Tidak Order: ${sales.noOrders}`}
                          />
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[9px] text-slate-400 font-semibold pt-1">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span>Baru Order ({sales.regularOrders})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-sky-500" />
                        <span>Repeat Order ({sales.repeatOrders})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Tidak Order ({sales.noOrders})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
