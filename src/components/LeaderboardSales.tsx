/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Award, 
  Medal, 
  TrendingUp, 
  Percent, 
  MapPin,
  Sparkles,
  ChevronUp,
  Briefcase
} from 'lucide-react';
import { Transaction, SalesPerformance } from '../types';
import { formatIDR } from '../utils/spreadsheetParser';

interface LeaderboardSalesProps {
  transactions: Transaction[];
  salesNames?: string[];
}

export default function LeaderboardSales({ transactions, salesNames }: LeaderboardSalesProps) {
  
  // Aggregate sales performance to calculate ranks
  const getRankedSales = (): SalesPerformance[] => {
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
      
      map[name].totalVisits += 1;
      
      if (tx.qtyPacks > 0) {
        map[name].totalOrders += 1;
        map[name].totalPacks += tx.qtyPacks;
        map[name].totalOmset += tx.omset;
        
        if (tx.statusKunjungan === 'Baru Order' || (tx.statusKunjungan as string) === 'Order') {
          map[name].regularOrders += 1;
        } else if (tx.statusKunjungan === 'Repeat Order') {
          map[name].repeatOrders += 1;
        }
      } else {
        map[name].noOrders += 1;
      }
    });

    return Object.values(map).map(sales => {
      sales.successRate = sales.totalVisits > 0 ? (sales.totalOrders / sales.totalVisits) * 100 : 0;
      return sales;
    }).sort((a, b) => b.totalPacks - a.totalPacks); // Ranked by packs sold
  };

  const rankedSales = getRankedSales();
  const topSales = rankedSales[0];
  const secondSales = rankedSales[1];
  const thirdSales = rankedSales[2];

  // Max volume for scaling progress bars
  const maxPacks = rankedSales.length > 0 ? Math.max(...rankedSales.map(s => s.totalPacks)) : 100;

  return (
    <div id="leaderboard_sales_view" className="space-y-6">
      
      {/* Podiums for Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        
        {/* Ranked #2 Silver Medal */}
        {secondSales && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-between relative order-2 md:order-1 mt-4 md:mt-8"
          >
            <div className="absolute top-4 left-4 text-xs font-black text-slate-300">#2</div>
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-500 relative shadow-inner">
              <Medal className="w-8 h-8" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-400 text-white font-black text-xs flex items-center justify-center border-2 border-white">
                2
              </div>
            </div>

            <div className="text-center mt-4">
              <h4 className="font-extrabold text-slate-900 text-sm">{secondSales.name}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Silver Winner</p>
              
              <div className="mt-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Volume Terjual</span>
                <strong className="text-base font-black text-slate-800 font-mono">{secondSales.totalPacks.toLocaleString('id-ID')} Pack</strong>
              </div>
            </div>

            <div className="w-full text-center mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-bold">
              Omset: {formatIDR(secondSales.totalOmset)}
            </div>
          </motion.div>
        )}

        {/* Ranked #1 Gold Medal (Main Centerpiece) */}
        {topSales && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col items-center justify-between relative order-1 md:order-2 ring-4 ring-amber-500/20"
          >
            {/* Top crown badge */}
            <div className="absolute -top-3.5 bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full border-2 border-slate-900 shadow-md flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 animate-spin" />
              <span>CROWN LEADER</span>
            </div>
            
            <div className="absolute top-4 left-4 text-xs font-black text-amber-500">#1</div>
            
            <div className="w-18 h-18 rounded-full bg-amber-500/15 border-2 border-amber-500 flex items-center justify-center text-amber-400 relative shadow-lg shadow-amber-500/10 mt-2">
              <Trophy className="w-10 h-10 animate-bounce" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-slate-900">
                1
              </div>
            </div>

            <div className="text-center mt-5">
              <h4 className="font-black text-white text-base truncate max-w-[180px]">{topSales.name}</h4>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Golden Achiever</p>
              
              <div className="mt-4 bg-slate-850 px-6 py-3 rounded-xl border border-slate-800 shadow-inner">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Volume Terjual</span>
                <strong className="text-xl font-black text-amber-400 font-mono">{topSales.totalPacks.toLocaleString('id-ID')} Pack</strong>
              </div>
            </div>

            <div className="w-full text-center mt-5 pt-3 border-t border-slate-800 text-xs text-emerald-400 font-bold">
              Omset: {formatIDR(topSales.totalOmset)}
            </div>
          </motion.div>
        )}

        {/* Ranked #3 Bronze Medal */}
        {thirdSales && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-between relative order-3 mt-4 md:mt-8"
          >
            <div className="absolute top-4 left-4 text-xs font-black text-amber-800">#3</div>
            <div className="w-14 h-14 rounded-full bg-amber-50/50 border border-amber-200 flex items-center justify-center text-amber-750 relative shadow-inner">
              <Award className="w-8 h-8 text-amber-700" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center border-2 border-white">
                3
              </div>
            </div>

            <div className="text-center mt-4">
              <h4 className="font-extrabold text-slate-900 text-sm">{thirdSales.name}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Bronze Achiever</p>
              
              <div className="mt-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Volume Terjual</span>
                <strong className="text-base font-black text-slate-800 font-mono">{thirdSales.totalPacks.toLocaleString('id-ID')} Pack</strong>
              </div>
            </div>

            <div className="w-full text-center mt-4 pt-3 border-t border-slate-100 text-[11px] text-emerald-600 font-bold">
              Omset: {formatIDR(thirdSales.totalOmset)}
            </div>
          </motion.div>
        )}

      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h4 className="text-sm font-bold text-slate-900 mb-6">Peringkat & Kinerja Akumulatif Sales</h4>
        
        <div className="space-y-4">
          {rankedSales.map((sales, index) => {
            const pctOfMax = maxPacks > 0 ? (sales.totalPacks / maxPacks) * 100 : 0;
            const colors = [
              'bg-amber-100 text-amber-800 border-amber-200', 
              'bg-slate-100 text-slate-700 border-slate-200', 
              'bg-amber-50 text-amber-900 border-amber-200/50'
            ];
            
            return (
              <div key={sales.name} id={`lead_row_${index}`}>
                {/* Mobile View Card (visible on mobile, hidden on sm/tablet/desktop) */}
                <div className="block sm:hidden p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 shadow-sm">
                  {/* Foto Sales & Nama Sales */}
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <span className={`w-11 h-11 rounded-full font-black text-xs flex items-center justify-center border shadow-sm ${colors[index] || 'bg-slate-200 text-slate-600 border-slate-200'}`}>
                        {sales.name.split(' ').map(n => n[0]).join('')}
                      </span>
                      <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white font-extrabold text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-extrabold text-slate-900">{sales.name}</h5>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PIC Salesperson</p>
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="flex items-center justify-between border-t border-slate-200/40 pt-2.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Rasio Sukses</span>
                    <strong className="text-xs font-bold text-indigo-600">{sales.successRate.toFixed(0)}% Kunjungan</strong>
                  </div>

                  {/* Statistik: Capaian Volume */}
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>Capaian Volume</span>
                    <span className="text-slate-600 font-bold">{sales.totalPacks} Pack</span>
                  </div>

                  {/* Progress Bar (height responsive, width 100%) */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${index === 0 ? 'bg-amber-500' : 'bg-slate-700'}`}
                      style={{ width: `${pctOfMax}%` }}
                    />
                  </div>

                  {/* Statistik: Omset */}
                  <div className="flex items-center justify-between border-t border-slate-200/40 pt-2.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Perkembangan Omset</span>
                    <strong className="text-sm font-black text-emerald-600 font-mono">{formatIDR(sales.totalOmset)}</strong>
                  </div>
                </div>

                {/* Tablet & Desktop View Card (visible on sm/tablet/desktop, hidden on mobile) */}
                <div className="hidden sm:flex p-3.5 lg:p-5 bg-slate-50 border border-slate-100 rounded-2xl items-center justify-between gap-4">
                  {/* Sales info (Foto & Nama) */}
                  <div className="flex items-center gap-3 lg:gap-4 min-w-[170px] lg:min-w-[220px]">
                    <div className="relative shrink-0">
                      <span className={`w-10 h-10 lg:w-11 lg:h-11 rounded-full font-black text-xs lg:text-sm flex items-center justify-center border shadow-sm ${colors[index] || 'bg-slate-200 text-slate-600 border-slate-200'}`}>
                        {sales.name.split(' ').map(n => n[0]).join('')}
                      </span>
                      <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white font-extrabold text-[8px] lg:text-[9px] w-4.5 h-4.5 lg:w-5 lg:h-5 rounded-full flex items-center justify-center border-2 border-white">
                        {index + 1}
                      </span>
                    </div>
                    
                    <div className="min-w-0">
                      <h5 className="text-xs lg:text-sm font-extrabold text-slate-900 truncate">{sales.name}</h5>
                      <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>PIC Salesperson</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress bar compared to top seller */}
                  <div className="flex-1 max-w-xs lg:max-w-md px-2 lg:px-4">
                    <div className="flex justify-between text-[9px] lg:text-[10px] text-slate-400 font-bold mb-1">
                      <span>Capaian Volume</span>
                      <span className="text-slate-600 font-semibold">{sales.totalPacks} Pack</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${index === 0 ? 'bg-amber-500' : 'bg-slate-700'}`}
                        style={{ width: `${pctOfMax}%` }}
                      />
                    </div>
                  </div>

                  {/* Performance stats right */}
                  <div className="flex items-center gap-4 lg:gap-8 text-right shrink-0">
                    <div>
                      <span className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase block">Rasio Sukses</span>
                      <strong className="text-xs font-bold text-indigo-600">{sales.successRate.toFixed(0)}% Kunjungan</strong>
                    </div>
                    <div>
                      <span className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase block">Perkembangan Omset</span>
                      <strong className="text-xs lg:text-sm font-black text-emerald-600 font-mono">{formatIDR(sales.totalOmset)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
