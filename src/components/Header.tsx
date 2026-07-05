/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Clock, Trophy, Award, RefreshCw, Menu, Sun, Moon } from 'lucide-react';
import { Transaction } from '../types';
import { formatIDR } from '../utils/spreadsheetParser';

interface HeaderProps {
  title: string;
  transactions: Transaction[];
  onRefresh: () => void;
  loading: boolean;
  onToggleSidebarMobile?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export default function Header({ 
  title, 
  transactions, 
  onRefresh, 
  loading,
  onToggleSidebarMobile,
  theme = 'light',
  onToggleTheme
}: HeaderProps) {
  const [time, setTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format real-time clock to Indonesian style
  const formatTimeIndo = (date: Date): string => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const dayName = days[date.getDay()];
    const dateNum = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${dayName}, ${dateNum} ${monthName} ${year} — ${hours}:${minutes}:${seconds} WIB`;
  };

  // Extract Top 3 Sales from current transactions to render the Mini Leaderboard
  const getTopSales = () => {
    const salesMap: Record<string, { packs: number; omset: number }> = {};
    
    transactions.forEach(tx => {
      if (tx.qtyPacks > 0) {
        if (!salesMap[tx.salesName]) {
          salesMap[tx.salesName] = { packs: 0, omset: 0 };
        }
        salesMap[tx.salesName].packs += tx.qtyPacks;
        salesMap[tx.salesName].omset += tx.omset;
      }
    });

    return Object.entries(salesMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.packs - a.packs)
      .slice(0, 3); // Top 3
  };

  const topSales = getTopSales();  return (
    <header 
      id="header_container" 
      className="min-h-16 bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 px-3.5 py-3 sm:px-6 md:px-8 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-sm shadow-slate-100/50 dark:shadow-none theme-transition"
    >
      {/* Left side: Hamburger button + Title */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Toggle Menu Button for Mobile & Tablet drawer */}
        {onToggleSidebarMobile && (
          <button
            type="button"
            onClick={onToggleSidebarMobile}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl lg:hidden focus:outline-none transition-all active:scale-95 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
            title="Buka Menu"
          >
            <Menu className="w-5 h-5 shrink-0" />
          </button>
        )}
 
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
            {title}
          </h2>
          <div className="flex items-center gap-1.5 text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-mono font-bold text-slate-600 dark:text-slate-300 truncate">{formatTimeIndo(time)}</span>
          </div>
        </div>
      </div>
 
      {/* Right side: Theme Toggle + Mini-Leaderboard (Hidden on mobile) and Sync Button */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Mini Leaderboard in the Header (Hidden on small screens) */}
        {topSales.length > 0 && (
          <div className="hidden xl:flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 py-1.5 px-3 rounded-xl shrink-0">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Top 3 (Packs):</span>
            </div>
            <div className="flex items-center gap-3.5">
              {topSales.map((sales, index) => {
                const colors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];
                return (
                  <div key={sales.name} className="flex items-center gap-1">
                    <Award className={`w-3.5 h-3.5 ${colors[index] || 'text-slate-300'} shrink-0`} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[70px] truncate">{sales.name.split(' ')[0]}</span>
                    <span className="text-[11px] font-mono font-black bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800 text-indigo-600 dark:text-amber-500">
                      {sales.packs}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Premium Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all active:scale-95 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center shrink-0 border border-transparent dark:border-slate-800"
            title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4.5 h-4.5 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-slate-600 shrink-0" />
            )}
          </button>
        )}
 
        {/* Compact Icon Sync Button for Mobile (Visible ONLY on mobile) */}
        <button
          onClick={onRefresh}
          disabled={loading}
          id="header_refresh_mobile_btn"
          className="flex sm:hidden items-center justify-center bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-75 h-11 w-11 shrink-0"
          title="Sinkron Sheet"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} shrink-0`} />
        </button>
 
        {/* Regular Text Sync Button for Tablet & Desktop (Hidden on mobile) */}
        <button
          onClick={onRefresh}
          disabled={loading}
          id="header_refresh_btn"
          className="hidden sm:flex items-center justify-center gap-2 bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-75 min-h-[44px] shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''} shrink-0`} />
          <span className="font-extrabold">{loading ? 'Menyinkronkan...' : 'Sinkron Sheet'}</span>
        </button>
      </div>
    </header>
  );
}
