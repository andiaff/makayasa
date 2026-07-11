/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  User, 
  TrendingUp, 
  ClipboardCheck, 
  Store, 
  UserPlus, 
  AlertCircle, 
  Coins,
  ChevronRight
} from 'lucide-react';
import { Transaction } from '../types';
import { formatIDR } from '../utils/spreadsheetParser';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

interface LaporanPerSalesProps {
  transactions: Transaction[];
  salesNames: string[];
  loggedInSalesName?: string | null;
}

export default function LaporanPerSales({ transactions, salesNames, loggedInSalesName }: LaporanPerSalesProps) {
  // 1. Local date range state (default: current month)
  const today = new Date();
  
  // Helper to format Date object to YYYY-MM-DD
  const formatDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${date}`;
  };

  // Default date inputs: 1st day of current month to current day
  const defaultStartDate = useMemo(() => {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return formatDateString(firstDay);
  }, []);

  const defaultEndDate = useMemo(() => {
    return formatDateString(today);
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);

  // 2. Selected sales name state
  // Default to first sales name or logged-in sales name
  const [selectedSales, setSelectedSales] = useState<string>(() => {
    if (loggedInSalesName) return loggedInSalesName;
    return salesNames[0] || '';
  });

  // Keep selectedSales updated if loggedInSalesName changes
  React.useEffect(() => {
    if (loggedInSalesName) {
      setSelectedSales(loggedInSalesName);
    }
  }, [loggedInSalesName]);

  // 3. Generate daily report list based on range
  const dailyReportData = useMemo(() => {
    if (!selectedSales || !startDate || !endDate) return [];

    const reports: any[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Reset hours to avoid timezone shifting
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const getLocalDateStr = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${date}`;
    };

    let current = new Date(start);
    let index = 1;

    // Safety guard to prevent infinite loop
    let loops = 0;
    while (current <= end && loops < 366) {
      loops++;
      const currentStr = getLocalDateStr(current);

      // Filter transactions for this sales on this specific date
      const dayTx = transactions.filter(tx => {
        const txSales = (tx.salesName || '').toLowerCase().trim();
        const selSales = selectedSales.toLowerCase().trim();
        if (txSales !== selSales) return false;

        const txDateStr = getLocalDateStr(new Date(tx.tanggal));
        return txDateStr === currentStr;
      });

      // Aggregate data
      const totalQty = dayTx.reduce((sum, tx) => sum + (tx.qtyPacks || 0), 0);
      const totalVisits = dayTx.length;

      // Unique stores ordered (statusKunjungan !== 'Tidak Order')
      const orderedStores = new Set(
        dayTx
          .filter(tx => (tx.statusKunjungan === 'Baru Order' || tx.statusKunjungan === 'Repeat Order') && (tx.qtyPacks || 0) > 0)
          .map(tx => tx.storeName.trim().toLowerCase())
      );
      const uniqueOrdersCount = orderedStores.size;

      // Unique new stores ordered based on user criteria:
      // 1. Must be their first order (statusKunjungan === 'Baru Order' and qtyPacks > 0)
      // 2. Must not be a Consumer (statusToko/rawStatusToko/storeName does not contain "konsumen")
      // 3. Must be the first order (transaksiKe is 1, 1 kali, etc.)
      // 4. Must not have been visited more than 2 times in the entire transaction history
      const newStoresOrdered = new Set(
        dayTx
          .filter(tx => {
            const hasOrdered = tx.statusKunjungan === 'Baru Order' && (tx.qtyPacks || 0) > 0;
            if (!hasOrdered) return false;

            const isConsumer = 
              (tx.statusToko || '').toLowerCase().includes('konsumen') ||
              (tx.rawStatusToko || '').toLowerCase().includes('konsumen') ||
              tx.storeName.toLowerCase().includes('konsumen') ||
              tx.storeName.toLowerCase().includes('pribadi') ||
              tx.storeName.toLowerCase().includes('end user');
            if (isConsumer) return false;

            const cleanTransaksi = (tx.transaksiKe || '').toLowerCase().trim();
            const isFirstOrder = 
              cleanTransaksi === '1' || 
              cleanTransaksi.includes('1 kali') || 
              cleanTransaksi.includes('ke-1') || 
              cleanTransaksi.includes('pertama') ||
              cleanTransaksi === '';
            if (!isFirstOrder && tx.transaksiKe) return false;

            const storeNameNormalized = tx.storeName.trim().toLowerCase();
            const totalVisits = transactions.filter(t => t.storeName.trim().toLowerCase() === storeNameNormalized).length;
            if (totalVisits > 2) return false;

            return true;
          })
          .map(tx => tx.storeName.trim().toLowerCase())
      );
      const uniqueNewStoresCount = newStoresOrdered.size;

      const totalOmset = dayTx.reduce((sum, tx) => sum + (tx.omset || 0), 0);

      reports.push({
        no: index++,
        tanggalRaw: currentStr,
        tanggal: current.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        penjualan: totalQty,
        kunjungan: totalVisits,
        tokoKonsumen: uniqueOrdersCount,
        tokoBaru: uniqueNewStoresCount,
        omset: totalOmset
      });

      // Advance one day
      current.setDate(current.getDate() + 1);
    }

    return reports;
  }, [transactions, selectedSales, startDate, endDate]);

  // 4. Calculate total summary for footer/summary cards
  const summaryTotals = useMemo(() => {
    return dailyReportData.reduce(
      (acc, row) => {
        acc.penjualan += row.penjualan;
        acc.kunjungan += row.kunjungan;
        acc.tokoKonsumen += row.tokoKonsumen;
        acc.tokoBaru += row.tokoBaru;
        acc.omset += row.omset;
        return acc;
      },
      { penjualan: 0, kunjungan: 0, tokoKonsumen: 0, tokoBaru: 0, omset: 0 }
    );
  }, [dailyReportData]);

  // 5. Excel download handler
  const handleDownloadExcel = () => {
    if (dailyReportData.length === 0) return;

    // Structure rows for SheetJS
    const excelRows = dailyReportData.map(r => ({
      'No': r.no,
      'Tanggal': r.tanggal,
      'Jumlah Penjualan (Packs)': r.penjualan,
      'Jumlah Kunjungan': r.kunjungan,
      'Jumlah Toko / Konsumen (Unique Order)': r.tokoKonsumen,
      'Jumlah Toko Baru': r.tokoBaru,
      'Jumlah Omset (Rupiah)': r.omset
    }));

    // Append standard totals row
    excelRows.push({
      'No': 'TOTAL',
      'Tanggal': '',
      'Jumlah Penjualan (Packs)': summaryTotals.penjualan,
      'Jumlah Kunjungan': summaryTotals.kunjungan,
      'Jumlah Toko / Konsumen (Unique Order)': summaryTotals.tokoKonsumen,
      'Jumlah Toko Baru': summaryTotals.tokoBaru,
      'Jumlah Omset (Rupiah)': summaryTotals.omset
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    // Apply auto-column widths for visual breathing space
    const wscols = [
      { wch: 8 },   // No
      { wch: 25 },  // Tanggal
      { wch: 25 },  // Jumlah Penjualan
      { wch: 20 },  // Jumlah Kunjungan
      { wch: 38 },  // Jumlah Toko / Konsumen
      { wch: 20 },  // Jumlah Toko Baru
      { wch: 25 }   // Jumlah Omset
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Sales');

    XLSX.writeFile(workbook, `Laporan_Sales_${selectedSales}_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" id="laporan_sales_view">
      
      {/* 1. SELECTION CARD HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Unduh Laporan Performa Sales
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih nama sales dan rentang tanggal untuk mengunduh laporan excel (.xlsx) harian secara terperinci.
            </p>
          </div>

          {dailyReportData.length > 0 && (
            <button
              onClick={handleDownloadExcel}
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-600/20 duration-150 shrink-0"
              id="btn_download_excel"
            >
              <Download className="w-4 h-4" />
              Unduh Excel (.xlsx)
            </button>
          )}
        </div>

        {/* 2. SELECT CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Sales Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Nama Salesman
            </label>
            {loggedInSalesName ? (
              <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {loggedInSalesName}
              </div>
            ) : (
              <select
                value={selectedSales}
                onChange={(e) => setSelectedSales(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="select_laporan_sales"
              >
                {salesNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Mulai Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              id="input_laporan_start_date"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              id="input_laporan_end_date"
            />
          </div>

        </div>
      </div>

      {/* 3. PERFORMANCE STATS PREVIEW CARDS */}
      {dailyReportData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/60 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 rounded-xl">
              <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Penjualan</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{summaryTotals.penjualan} <span className="text-[10px] text-slate-400 font-normal">Packs</span></p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/60 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
              <ClipboardCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Kunjungan</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{summaryTotals.kunjungan} <span className="text-[10px] text-slate-400 font-normal">Toko</span></p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/60 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
              <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toko Unik Order</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{summaryTotals.tokoKonsumen} <span className="text-[10px] text-slate-400 font-normal">Toko</span></p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/60 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl">
              <UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Toko Baru Order</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{summaryTotals.tokoBaru} <span className="text-[10px] text-slate-400 font-normal">Toko</span></p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/60 rounded-2xl p-4 col-span-2 lg:col-span-1 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
              <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Omset</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{formatIDR(summaryTotals.omset)}</p>
            </div>
          </div>

        </div>
      )}

      {/* 4. DATA PREVIEW TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Preview Laporan: {selectedSales} ({dailyReportData.length} Baris Data)
          </h4>
          <span className="text-[10px] font-bold px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300">
            {startDate} s/d {endDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="table_preview_laporan_sales">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-250 dark:border-slate-800">
                <th className="py-4 px-6 text-center w-12">No</th>
                <th className="py-4 px-6">Tanggal</th>
                <th className="py-4 px-6 text-right">Jumlah Penjualan (Packs)</th>
                <th className="py-4 px-6 text-right">Jumlah Kunjungan</th>
                <th className="py-4 px-6 text-right">Jumlah Toko/Konsumen (Unique Order)</th>
                <th className="py-4 px-6 text-right">Jumlah Toko Baru</th>
                <th className="py-4 px-6 text-right">Jumlah Omset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs text-slate-700 dark:text-slate-300">
              {dailyReportData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                    <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    Tidak ada data performa untuk rentang tanggal yang dipilih.
                  </td>
                </tr>
              ) : (
                dailyReportData.map((row) => (
                  <tr 
                    key={row.no} 
                    className="hover:bg-slate-50/55 dark:hover:bg-slate-800/10 transition-colors"
                  >
                    <td className="py-3 px-6 font-bold text-slate-400 text-center">{row.no}</td>
                    <td className="py-3 px-6 font-bold text-slate-800 dark:text-slate-200">{row.tanggal}</td>
                    <td className="py-3 px-6 text-right font-semibold text-sky-600 dark:text-sky-400">{row.penjualan}</td>
                    <td className="py-3 px-6 text-right font-medium text-slate-600 dark:text-slate-400">{row.kunjungan}</td>
                    <td className="py-3 px-6 text-right font-medium text-emerald-600 dark:text-emerald-400">{row.tokoKonsumen}</td>
                    <td className="py-3 px-6 text-right font-medium text-purple-600 dark:text-purple-400">
                      {row.tokoBaru > 0 ? (
                        <span className="bg-purple-50 dark:bg-purple-950/20 px-2 py-0.5 rounded-full text-purple-600 dark:text-purple-300 font-extrabold text-[11px]">
                          {row.tokoBaru} Toko Baru
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">-</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right font-extrabold text-slate-900 dark:text-slate-100">{formatIDR(row.omset)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {dailyReportData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs font-black text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700">
                  <td className="py-4 px-6 text-center" colSpan={2}>TOTAL / JUMLAH</td>
                  <td className="py-4 px-6 text-right text-sky-600 dark:text-sky-400">{summaryTotals.penjualan} Packs</td>
                  <td className="py-4 px-6 text-right text-slate-700 dark:text-slate-300">{summaryTotals.kunjungan} Kunjungan</td>
                  <td className="py-4 px-6 text-right text-emerald-600 dark:text-emerald-400">{summaryTotals.tokoKonsumen} Toko</td>
                  <td className="py-4 px-6 text-right text-purple-600 dark:text-purple-400">{summaryTotals.tokoBaru} Toko Baru</td>
                  <td className="py-4 px-6 text-right text-emerald-600 dark:text-emerald-400">{formatIDR(summaryTotals.omset)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

    </div>
  );
}
