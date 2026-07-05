/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Database, CloudLightning, CheckCircle2 } from 'lucide-react';

interface SkeletonLoaderProps {
  key?: string;
  menuId: number;
}

export default function SkeletonLoader({ menuId }: SkeletonLoaderProps) {
  const [progressStep, setProgressStep] = useState(0);

  // Realistic synchronization steps simulation for Google Sheets fetching
  const syncSteps = [
    { label: 'Menghubungkan ke Google Sheets API...', icon: Database, color: 'text-amber-500' },
    { label: 'Mengambil baris data transaksi terbaru...', icon: RefreshCw, color: 'text-indigo-500' },
    { label: 'Menghitung omset, stok, & performa sales...', icon: CloudLightning, color: 'text-emerald-500' },
    { label: 'Sinkronisasi selesai! Merender tampilan...', icon: CheckCircle2, color: 'text-teal-500' },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setProgressStep(1), 400);
    const timer2 = setTimeout(() => setProgressStep(2), 900);
    const timer3 = setTimeout(() => setProgressStep(3), 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const ActiveIcon = syncSteps[progressStep].icon;

  // Render specific layout skeletons
  const renderSkeletonContent = () => {
    switch (menuId) {
      case 1: // Dashboard
        return (
          <div className="space-y-6">
            {/* KPI Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="space-y-2.5 flex-1 pr-4">
                    <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-6 w-1/2 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-2 w-5/6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mt-1" />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center shrink-0" />
                </div>
              ))}
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left bento block: Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                </div>
                {/* Large graph placeholder */}
                <div className="h-[280px] bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-900 flex items-end p-4 space-x-4 animate-pulse">
                  {[20, 35, 15, 60, 45, 80, 50, 65, 30, 45, 75, 90, 40, 60].map((h, idx) => (
                    <div 
                      key={idx} 
                      className="bg-slate-200 dark:bg-slate-800/80 rounded-t flex-1" 
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Right bento block: List / Region */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-4">
                <div className="space-y-1.5">
                  <div className="h-4 w-1/2 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </div>
                {/* Simulated table list rows */}
                <div className="space-y-3 pt-2">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-900/40">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 animate-pulse" />
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="h-3.5 w-3/4 bg-slate-300 dark:bg-slate-700 rounded animate-pulse truncate" />
                          <div className="h-2 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse truncate" />
                        </div>
                      </div>
                      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse shrink-0 ml-3" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // Penjualan & Omset
      case 3: // Kunjungan
      case 4: // Database Toko
      case 5: // Leaderboard
      case 8: // Log Transaksi
      case 10: // Operasional
      case 11: // Stok Gudang
      case 12: // Stok Sales
      case 14: // Setoran Sales
      case 16: // Wilayah
        return (
          <div className="space-y-6">
            {/* Top metrics summary inside view page */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-5 w-2/3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
                </div>
              ))}
            </div>

            {/* Simulated search & filters widget row */}
            <div className="flex flex-col sm:flex-row gap-3.5 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm">
              <div className="h-10 w-full sm:w-72 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <div className="h-10 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-10 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Detailed list / table skeleton card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="h-4 w-44 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2">
                {[1, 2, 3, 4, 5, 6].map((row) => (
                  <div key={row} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0 animate-pulse" />
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="h-3.5 w-1/3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                        <div className="h-2.5 w-1/2 bg-slate-100 dark:bg-slate-800/80 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-end gap-2 shrink-0">
                      <div className="h-4 w-20 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                      <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default: // Settings, Integrators, and simpler layouts
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left sidebar option lists */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm h-fit space-y-4">
              <div className="h-4 w-1/2 bg-slate-300 dark:bg-slate-700 rounded animate-pulse mb-2" />
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900/35">
                  <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 shrink-0 animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-3/4 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-2 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>

            {/* Right configuration forms */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm space-y-6">
              <div className="border-b border-slate-150 dark:border-slate-800 pb-3">
                <div className="h-4.5 w-1/3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse mb-1.5" />
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              </div>

              {/* Form input skeletons */}
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                  </div>
                ))}
              </div>

              {/* Action buttons skeleton */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-150 dark:border-slate-800">
                <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-10 w-32 bg-slate-300 dark:bg-slate-700 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Synchronization elegant progress block */}
      <div 
        id="sheets_sync_loader_banner"
        className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50 to-amber-50 dark:from-slate-900 dark:to-slate-900/60 border border-indigo-100/80 dark:border-indigo-950/50 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden"
      >
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-900 [mask-image:linear-gradient(0deg,transparent,black)] pointer-events-none opacity-40" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20 animate-spin shrink-0">
            <ActiveIcon className={`w-5 h-5 ${progressStep === 0 ? '' : 'animate-pulse'}`} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 dark:bg-amber-500"></span>
              </span>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Sinkronisasi Spreadsheet
              </h3>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>{syncSteps[progressStep].label}</span>
            </p>
          </div>
        </div>

        {/* Floating progress percentage / indicator */}
        <div className="w-full md:w-56 space-y-1.5 relative z-10 shrink-0">
          <div className="flex items-center justify-between text-xs font-mono font-black text-indigo-600 dark:text-amber-500">
            <span>MEMUAT DATA</span>
            <span>{Math.round(((progressStep + 1) / syncSteps.length) * 100)}%</span>
          </div>
          {/* Progress bar tracks */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div 
              className="bg-indigo-600 dark:bg-amber-500 h-full rounded-full"
              initial={{ width: '10%' }}
              animate={{ width: `${((progressStep + 1) / syncSteps.length) * 100}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>
      </div>

      {/* Actual contextual skeleton screen below */}
      <div id="sheets_sync_loader_body" className="relative">
        {renderSkeletonContent()}
      </div>
    </motion.div>
  );
}
