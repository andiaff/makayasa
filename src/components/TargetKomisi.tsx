/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  Coins, 
  Percent, 
  TrendingUp, 
  Award, 
  TrendingDown, 
  ChevronRight,
  Info
} from 'lucide-react';
import { Transaction, SalesPerformance } from '../types';
import { formatIDR } from '../utils/spreadsheetParser';

interface TargetKomisiProps {
  transactions: Transaction[];
  salesNames?: string[];
}

export default function TargetKomisi({ transactions, salesNames }: TargetKomisiProps) {
  const [monthlyTarget, setMonthlyTarget] = useState(300); // 300 packs target
  const [commissionPerPack, setCommissionPerPack] = useState(350); // Rp 350 per pack sold
  const [bonusTargetHit, setBonusTargetHit] = useState(50000); // Rp 50.000 cash bonus if hit target

  // Aggregate sales performance to calculate actual achievements
  const getSalesAchievements = (): SalesPerformance[] => {
    const activeSales = salesNames && salesNames.length > 0 
      ? salesNames 
      : Array.from(new Set(transactions.map(tx => tx.salesName).filter(name => name && name !== 'Sales Tak Dikenal')));
      
    const map: Record<string, SalesPerformance> = {};

    activeSales.forEach(name => {
      map[name] = {
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
      if (!map[name]) {
        map[name] = {
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
      
      if (tx.qtyPacks > 0) {
        map[name].totalPacks += tx.qtyPacks;
        map[name].totalOmset += tx.omset;
      }
    });

    return Object.values(map);
  };

  const salesAchievements = getSalesAchievements();

  // Total estimated payout across all sales
  let totalEstimatedPayout = 0;

  return (
    <div id="target_komisi_view" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Commission Configuration Slider (Controls) */}
      <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            <span>Simulator Komisi Owner</span>
          </h4>
          <p className="text-xs text-slate-500 mt-1">Sesuaikan target volume dan insentif komisi sales Makayasa</p>
        </div>

        {/* Input 1: Monthly Target Packs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Target Distribusi (Pack):</label>
            <span className="text-xs font-black text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 font-mono">
              {monthlyTarget} Pack
            </span>
          </div>
          <input
            type="range"
            id="slider_monthly_target"
            min="50"
            max="1000"
            step="10"
            value={monthlyTarget}
            onChange={(e) => setMonthlyTarget(parseInt(e.target.value, 10))}
            className="w-full accent-amber-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block font-medium">Batas minimal target volume yang wajib dicapai sales</span>
        </div>

        {/* Input 2: Commission per pack */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Komisi per Pack (Rp):</label>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 font-mono">
              {formatIDR(commissionPerPack)}
            </span>
          </div>
          <input
            type="range"
            id="slider_commission_rate"
            min="50"
            max="1500"
            step="50"
            value={commissionPerPack}
            onChange={(e) => setCommissionPerPack(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block font-medium">Insentif tunai yang diterima sales per satu pack rokok terjual</span>
        </div>

        {/* Input 3: Bonus Target Hit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Bonus Capaian Target (Rp):</label>
            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 font-mono">
              {formatIDR(bonusTargetHit)}
            </span>
          </div>
          <input
            type="range"
            id="slider_bonus_cash"
            min="0"
            max="250000"
            step="10000"
            value={bonusTargetHit}
            onChange={(e) => setBonusTargetHit(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] text-slate-400 block font-medium">Apresiasi tunai tambahan jika sales melampaui target volume</span>
        </div>

        {/* Info panel */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex gap-2.5 items-start">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-normal">
            Formula Simulator: <br />
            <strong>Total Gaji Komisi = (Volume * Komisi Per Pack) + (Bonus Target jika Volume &gt;= Target)</strong>.
          </p>
        </div>
      </div>

      {/* Sales Achievement and Payout Matrix (Simulation Results) */}
      <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Hasil Simulasi & Pencapaian Sales</h4>
          <p className="text-xs text-slate-500 mt-1">Estimasi pengeluaran insentif owner berdasarkan kinerja real-time terfilter</p>
        </div>

        <div className="space-y-4">
          {salesAchievements.map((sales, index) => {
            const isTargetHit = sales.totalPacks >= monthlyTarget;
            const basicCommission = sales.totalPacks * commissionPerPack;
            const actualBonus = isTargetHit ? bonusTargetHit : 0;
            const totalCommission = basicCommission + actualBonus;
            
            // Add to total payout tracker
            totalEstimatedPayout += totalCommission;

            // Target percentage
            const targetPct = Math.min((sales.totalPacks / monthlyTarget) * 100, 100);

            return (
              <div 
                key={sales.name} 
                id={`target_row_${index}`}
                className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3"
              >
                {/* Header detail */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-black text-xs">
                      {sales.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-900">{sales.name}</h5>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mt-0.5">PIC Salesperson</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isTargetHit ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-1 rounded border border-emerald-200">
                        Target Tercapai
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-2 py-1 rounded border border-amber-200">
                        {monthlyTarget - sales.totalPacks} Pack Lagi
                      </span>
                    )}
                    
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Estimasi Komisi</span>
                      <strong className="text-xs font-extrabold text-emerald-600 font-mono">{formatIDR(totalCommission)}</strong>
                    </div>
                  </div>
                </div>

                {/* Progress bar towards target */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                    <span>Progress Target ({sales.totalPacks} / {monthlyTarget} Pack)</span>
                    <span className="font-bold">{targetPct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full rounded-full ${isTargetHit ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${targetPct}%` }}
                    />
                  </div>
                </div>

                {/* Sub breakdown details */}
                <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/40">
                  <span>Komisi Dasar: {formatIDR(basicCommission)}</span>
                  <span>Bonus Tambahan: {formatIDR(actualBonus)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global estimated incentive cost */}
        <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h5 className="text-xs font-bold text-amber-400 uppercase tracking-widest">Total Payout Komisi Owner</h5>
            <p className="text-[10px] text-slate-400 mt-1">Total beban komisi & bonus yang dialokasikan untuk 5 sales terfilter</p>
          </div>
          <div className="text-right">
            <h3 className="text-xl font-black text-white font-mono">{formatIDR(totalEstimatedPayout)}</h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Alokasi Kas Perusahaan</span>
          </div>
        </div>

      </div>

    </div>
  );
}
