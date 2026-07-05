/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Filter, 
  CheckCircle, 
  Flame, 
  CalendarDays, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  ArrowRight,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { FilterOption } from '../types';

interface FilterBarProps {
  filter: FilterOption;
  setFilter: (filter: FilterOption) => void;
  totalRecords: number;
}

export default function FilterBar({ filter, setFilter, totalRecords }: FilterBarProps) {
  // --- STATE FOR ADVANCED ACCOUNTING CYCLES ---
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Default: June
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Default: 2026
  const [cycleType, setCycleType] = useState<'calendar' | 'custom'>('calendar'); // Default: Calendar Month (1-30) for intuitive navigation
  const [customStartDay, setCustomStartDay] = useState<number>(15); // Default: 15 (e.g. 15 May - 15 June)

  // Standard short names for Indonesian months
  const indonesianMonths = [
    { value: 1, name: 'Januari' },
    { value: 2, name: 'Februari' },
    { value: 3, name: 'Maret' },
    { value: 4, name: 'April' },
    { value: 5, name: 'Mei' },
    { value: 6, name: 'Juni' },
    { value: 7, name: 'Juli' },
    { value: 8, name: 'Agustus' },
    { value: 9, name: 'September' },
    { value: 10, name: 'Oktober' },
    { value: 11, name: 'November' },
    { value: 12, name: 'Desember' }
  ];

  const years = [2025, 2026, 2027];

  // Helper to format Date to 'YYYY-MM-DD'
  const formatDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${date}`;
  };

  // Main logic to compute start and end dates based on inputs
  const applyAccountingCycle = (month: number, year: number, type: 'calendar' | 'custom', startDay: number) => {
    let startStr = '';
    let endStr = '';

    if (type === 'calendar') {
      // Full Calendar Month (e.g. June 1 to June 30)
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0); // last day of month
      startStr = formatDateString(start);
      endStr = formatDateString(end);
    } else {
      // Custom Billing Cycle (e.g. 15th of previous month to 15th of selected month)
      const start = new Date(year, month - 2, startDay);
      const end = new Date(year, month - 1, startDay);
      startStr = formatDateString(start);
      endStr = formatDateString(end);
    }

    setFilter({
      type: 'range',
      startDate: startStr,
      endDate: endStr
    });
  };

  // Trigger calculation whenever cycle state changes
  const handleCycleChange = (month: number, year: number, type: 'calendar' | 'custom', startDay: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setCycleType(type);
    setCustomStartDay(startDay);
    applyAccountingCycle(month, year, type, startDay);
  };

  // Standard filter buttons
  const filterTypes = [
    { type: 'today', name: 'Hari Ini', desc: 'Hari ini', icon: Flame },
    { type: 'yesterday', name: 'Kemarin', desc: 'Kemarin', icon: CalendarDays },
    { type: 'week', name: 'Perminggu', desc: '7 hari terakhir', icon: CalendarDays },
    { type: 'month', name: 'Perbulan (30 Hari)', desc: '30 hari terakhir', icon: Calendar },
    { type: 'range', name: 'Rentang Manual', desc: 'Kostum tanggal manual', icon: Filter },
  ];

  const handleTypeSelect = (type: 'today' | 'yesterday' | 'week' | 'month' | 'range') => {
    if (type === 'range') {
      const today = new Date();
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      setFilter({
        type,
        startDate: formatDateString(lastWeek),
        endDate: formatDateString(today)
      });
    } else {
      setFilter({ type });
    }
  };

  // Format date readable for Indo preview (e.g., "15 Mei 2026 s/d 15 Juni 2026")
  const formatDateReadable = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-3">
      {/* 1. FILTER BAR PANEL */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Mobile-Only Layout (hidden on sm and above) */}
        <div className="block sm:hidden space-y-3 w-full">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1.5">Periode Transaksi</label>
              <div className="relative">
                <select
                  value={filter.type}
                  onChange={(e) => handleTypeSelect(e.target.value as any)}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl py-3 pl-10 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer min-h-[44px]"
                >
                  <option value="today">🔥 Hari Ini</option>
                  <option value="yesterday">📅 Kemarin</option>
                  <option value="week">📅 Perminggu (7 Hari Terakhir)</option>
                  <option value="month">📅 Perbulan (30 Hari Terakhir)</option>
                  <option value="range">⚙ Rentang Manual</option>
                </select>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Filter className="w-4 h-4 text-amber-500 animate-pulse" />
                </div>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* ADVANCED OPTION BUTTON (Mobile) */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-bold transition-all border min-h-[44px] ${
                showAdvanced || (filter.type === 'range' && (customStartDay !== 1 || cycleType === 'custom'))
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Siklus Buku & Filter Bulanan</span>
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Manual Range Date Inputs (Mobile specific grid to prevent wrap/overlaps) */}
          {filter.type === 'range' && !showAdvanced && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <span className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Atur Rentang Tanggal Manual</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-slate-200 rounded-lg p-2 flex flex-col justify-center min-h-[44px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Dari</span>
                  <input
                    type="date"
                    id="filter_start_date_mobile"
                    value={filter.startDate || ''}
                    onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                    className="bg-transparent text-slate-700 focus:outline-none cursor-pointer text-xs font-bold w-full mt-0.5"
                  />
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2 flex flex-col justify-center min-h-[44px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase">S/D</span>
                  <input
                    type="date"
                    id="filter_end_date_mobile"
                    value={filter.endDate || ''}
                    onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                    className="bg-transparent text-slate-700 focus:outline-none cursor-pointer text-xs font-bold w-full mt-0.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Counter Status on Mobile */}
          <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-100">
            <span className="text-slate-400 text-[11px] font-bold">Total Terfilter:</span>
            <div className="flex items-center gap-1.5 text-slate-700 text-xs font-extrabold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>{totalRecords} Data</span>
            </div>
          </div>
        </div>

        {/* Tablet & Desktop Layout (hidden on mobile) */}
        <div className="hidden sm:flex flex-wrap items-center gap-2">
          {filterTypes.map((item) => {
            const Icon = item.icon;
            const isActive = filter.type === item.type;
            return (
              <button
                key={item.type}
                id={`filter_pill_${item.type}`}
                onClick={() => handleTypeSelect(item.type as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
                title={item.desc}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </button>
            );
          })}

          <div className="h-6 w-px bg-slate-200 hidden md:block mx-1" />

          {/* ADVANCED OPTION BUTTON */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              showAdvanced || (filter.type === 'range' && (customStartDay !== 1 || cycleType === 'custom'))
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0 text-indigo-600" />
            <span>Siklus Pembukuan & Filter Bulanan</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>
        </div>

        {/* Right Side (Tablet/Desktop): Manual Inputs OR Current Active Info */}
        <div className="hidden sm:flex items-center gap-3 self-end lg:self-auto">
          {filter.type === 'range' && !showAdvanced && (
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-150 text-xs font-bold">
              <div className="flex items-center gap-1 px-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase">Dari:</span>
                <input
                  type="date"
                  id="filter_start_date"
                  value={filter.startDate || ''}
                  onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                  className="bg-transparent text-slate-700 focus:outline-none cursor-pointer text-xs font-extrabold"
                />
              </div>
              <span className="text-slate-300">-</span>
              <div className="flex items-center gap-1 px-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase">S/D:</span>
                <input
                  type="date"
                  id="filter_end_date"
                  value={filter.endDate || ''}
                  onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                  className="bg-transparent text-slate-700 focus:outline-none cursor-pointer text-xs font-extrabold"
                />
              </div>
            </div>
          )}

          {/* Record counter indicator */}
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Tersaring <strong className="text-slate-800 font-extrabold">{totalRecords}</strong> data</span>
          </div>
        </div>

      </div>

      {/* 2. ADVANCED CYCLES CONTROLLER PANEL (EXPANDABLE) */}
      {showAdvanced && (
        <div className="bg-indigo-950 text-indigo-100 rounded-2xl p-5 border border-indigo-800 shadow-lg space-y-4 relative overflow-hidden">
          {/* Subtle decor glowing orb */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-indigo-900/80 pb-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-black tracking-wider uppercase text-amber-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                Alat Siklus Pembukuan & Periode Spesifik
              </h4>
              <p className="text-[10px] text-indigo-300 font-medium">
                Solusi praktis untuk membandingkan performa per-bulan murni (tgl 1-30) atau per-siklus tutup buku (tgl 15-15).
              </p>
            </div>
            
            {/* Display active calculation preview */}
            <div className="bg-indigo-900/50 border border-indigo-800/80 px-3 py-2 rounded-xl text-center self-stretch md:self-auto flex items-center justify-center gap-2">
              <span className="text-[10px] font-black uppercase text-indigo-300">Periode Aktif:</span>
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
                <span>{formatDateReadable(filter.startDate)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                <span>{formatDateReadable(filter.endDate)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
            
            {/* COLUMN 1: SELECT MONTH */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-indigo-300 font-extrabold">Pilih Bulan Acuan</label>
              <select
                value={selectedMonth}
                onChange={(e) => handleCycleChange(Number(e.target.value), selectedYear, cycleType, customStartDay)}
                className="w-full bg-indigo-900 border border-indigo-800 text-white rounded-xl px-3 py-2.5 text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {indonesianMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* COLUMN 2: SELECT YEAR */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-indigo-300 font-extrabold">Pilih Tahun</label>
              <select
                value={selectedYear}
                onChange={(e) => handleCycleChange(selectedMonth, Number(e.target.value), cycleType, customStartDay)}
                className="w-full bg-indigo-900 border border-indigo-800 text-white rounded-xl px-3 py-2.5 text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {years.map(y => (
                  <option key={y} value={y}>Tahun {y}</option>
                ))}
              </select>
            </div>

            {/* COLUMN 3: CYCLE MODE SELECTOR */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-indigo-300 font-extrabold">Aturan Siklus / Model Periode</label>
              <div className="grid grid-cols-2 gap-1 bg-indigo-900 p-1 rounded-xl border border-indigo-800">
                <button
                  type="button"
                  onClick={() => handleCycleChange(selectedMonth, selectedYear, 'calendar', customStartDay)}
                  className={`py-2 rounded-lg text-[10px] font-black transition-all ${
                    cycleType === 'calendar' 
                      ? 'bg-amber-500 text-slate-950 shadow-sm' 
                      : 'text-indigo-200 hover:bg-indigo-850'
                  }`}
                >
                  Kalender (1 s/d Akhir)
                </button>
                <button
                  type="button"
                  onClick={() => handleCycleChange(selectedMonth, selectedYear, 'custom', customStartDay)}
                  className={`py-2 rounded-lg text-[10px] font-black transition-all ${
                    cycleType === 'custom' 
                      ? 'bg-indigo-600 text-white shadow-sm border border-indigo-500/50' 
                      : 'text-indigo-200 hover:bg-indigo-850'
                  }`}
                >
                  Siklus Kas (15 ke 15)
                </button>
              </div>
            </div>

            {/* COLUMN 4: CYCLE START DAY SETTING (Only active if custom cycle is chosen) */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-indigo-300 font-extrabold">
                Hari Mulai Siklus Buku
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="2"
                  max="28"
                  disabled={cycleType === 'calendar'}
                  value={customStartDay}
                  onChange={(e) => {
                    const val = Math.min(28, Math.max(2, Number(e.target.value) || 2));
                    handleCycleChange(selectedMonth, selectedYear, cycleType, val);
                  }}
                  className={`w-full bg-indigo-900 border text-white rounded-xl px-3 py-2.5 text-xs font-black focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                    cycleType === 'calendar' 
                      ? 'opacity-40 cursor-not-allowed border-indigo-900 text-indigo-400' 
                      : 'border-indigo-800 cursor-pointer'
                  }`}
                  placeholder="Contoh: 15"
                />
                {cycleType === 'custom' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-indigo-400 font-bold pointer-events-none">
                    Mulai Tgl {customStartDay}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* Quick guide text */}
          <div className="bg-indigo-900/30 p-3 rounded-xl border border-indigo-900/50 flex items-start gap-2.5 text-[10px] text-indigo-300 leading-relaxed">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-amber-300">Cara kerja filter siklus ini:</span>
              <ul className="list-disc pl-3 mt-1 space-y-0.5 font-medium">
                {cycleType === 'calendar' ? (
                  <li>Sistem menyaring data transaksi penuh mulai <strong className="text-white">1 {indonesianMonths.find(m => m.value === selectedMonth)?.name} {selectedYear}</strong> sampai <strong className="text-white">akhir bulan</strong> tersebut.</li>
                ) : (
                  <li>Sistem menyaring data kas harian mulai <strong className="text-white">{customStartDay} {indonesianMonths.find(m => m.value === (selectedMonth === 1 ? 12 : selectedMonth - 1))?.name} {selectedMonth === 1 ? selectedYear - 1 : selectedYear}</strong> sampai <strong className="text-white">{customStartDay} {indonesianMonths.find(m => m.value === selectedMonth)?.name} {selectedYear}</strong>.</li>
                )}
                <li>Semua data di dashboard utama, grafik kunjungan, komisi, setoran sales, dan log aktivitas akan ikut menyinkronkan data secara otomatis sesuai rentang ini.</li>
              </ul>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
