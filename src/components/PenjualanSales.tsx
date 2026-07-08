/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ShoppingBag, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Award,
  ChevronRight,
  TrendingUpIcon,
  Store,
  MapPin
} from 'lucide-react';
import { Transaction, SalesPerformance } from '../types';
import { formatIDR } from '../utils/spreadsheetParser';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface PenjualanSalesProps {
  transactions: Transaction[];
  salesNames?: string[];
}

export default function PenjualanSales({ transactions, salesNames }: PenjualanSalesProps) {
  
  // Aggregate sales statistics for the active salespersons
  const getSalesPerformance = (): SalesPerformance[] => {
    const activeSales = salesNames && salesNames.length > 0 
      ? salesNames 
      : Array.from(new Set(transactions.map(tx => tx.salesName).filter(name => name && name !== 'Sales Tak Dikenal')));
      
    const performanceMap: Record<string, SalesPerformance> = {};

    // Initialize all loaded salespersons to ensure they always appear
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
      // If we encounter a new sales in sheet, initialize them too
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

    // Calculate conversion rates and return list
    return Object.values(performanceMap).map(sales => {
      sales.successRate = sales.totalVisits > 0 ? (sales.totalOrders / sales.totalVisits) * 100 : 0;
      return sales;
    }).sort((a, b) => b.totalPacks - a.totalPacks); // Sort highest packs first
  };

  const performanceData = React.useMemo(() => {
    return getSalesPerformance();
  }, [transactions]);

  const [selectedSales, setSelectedSales] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (performanceData.length > 0) {
      const names = performanceData.map(s => s.name);
      if (!selectedSales) {
        setSelectedSales(performanceData[0].name);
      } else if (!names.includes(selectedSales)) {
        setSelectedSales(performanceData[0].name);
      }
    }
  }, [performanceData, selectedSales]);

  // Find top 3 most-sold store locations for the selected salesperson
  const topStoresForSelectedSales = React.useMemo(() => {
    if (!selectedSales) return [];

    // Filter transactions by the selected sales, successful order status, and non-zero packs
    const filteredTx = transactions.filter(
      tx => tx.salesName === selectedSales && tx.statusKunjungan !== 'Tidak Order' && tx.qtyPacks > 0
    );

    // Group by store name and address
    const storeMap: Record<string, { storeName: string; storeAddress: string; qtyPacks: number; omset: number; count: number }> = {};

    filteredTx.forEach(tx => {
      const key = `${tx.storeName}||${tx.storeAddress}`;
      if (!storeMap[key]) {
        storeMap[key] = {
          storeName: tx.storeName,
          storeAddress: tx.storeAddress || 'Alamat tidak diketahui',
          qtyPacks: 0,
          omset: 0,
          count: 0
        };
      }
      storeMap[key].qtyPacks += tx.qtyPacks;
      storeMap[key].omset += tx.omset;
      storeMap[key].count += 1;
    });

    // Convert to array, sort by totalPacks descending, then take top 3
    return Object.values(storeMap)
      .sort((a, b) => b.qtyPacks - a.qtyPacks)
      .slice(0, 3);
  }, [transactions, selectedSales]);

  // Find some high-level helper metrics
  const totalOmset = performanceData.reduce((acc, curr) => acc + curr.totalOmset, 0);
  const totalPacks = performanceData.reduce((acc, curr) => acc + curr.totalPacks, 0);
  const averagePacks = performanceData.length > 0 ? totalPacks / performanceData.length : 0;
  const bestSales = performanceData[0] || { name: '-', totalPacks: 0, totalOmset: 0 };

  // Generate chart data showing daily timeline trends per salesperson
  const getDailySalesTimeline = () => {
    const dailyMap: Record<string, Record<string, number | string>> = {};
    const salesNames = performanceData.map(s => s.name);

    // Filter transactions and sort in chronological order
    const sortedTx = [...transactions].sort((a, b) => a.tanggal.getTime() - b.tanggal.getTime());

    sortedTx.forEach(tx => {
      const day = tx.tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day };
        // Initialize all active sales with 0
        salesNames.forEach(name => {
          dailyMap[day][name] = 0;
        });
      }
      if (tx.qtyPacks > 0) {
        const currentVal = (dailyMap[day][tx.salesName] as number) || 0;
        dailyMap[day][tx.salesName] = currentVal + tx.qtyPacks;
      }
    });

    return Object.values(dailyMap);
  };

  const timelineData = getDailySalesTimeline();

  // Color options for charts
  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  return (
    <div id="penjualan_sales_view" className="space-y-6">
      
      {/* High-level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sales Terbaik (Volume)</p>
            <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">{bestSales.name}</h4>
            <p className="text-xs text-amber-600 font-semibold mt-0.5">
              Pencapaian: {bestSales.totalPacks.toLocaleString('id-ID')} Pack ({formatIDR(bestSales.totalOmset)})
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-slate-100 flex items-center justify-center text-indigo-500 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rata-rata Distribusi</p>
            <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">{Math.round(averagePacks).toLocaleString('id-ID')} Pack / Sales</h4>
            <p className="text-xs text-indigo-600 font-semibold mt-0.5">
              Total sales aktif: {performanceData.length} personel
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-slate-100 flex items-center justify-center text-emerald-500 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pendapatan Terfilter</p>
            <h4 className="text-lg font-extrabold text-slate-900 mt-0.5">{formatIDR(totalOmset)}</h4>
            <p className="text-xs text-emerald-600 font-semibold mt-0.5">
              Total volume: {totalPacks.toLocaleString('id-ID')} Pack rokok
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Salespersons Detail */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Breakdown Kinerja Sales Makayasa</h4>
            <p className="text-xs text-slate-400">Klik salah satu sales di bawah ini untuk melihat rincian lokasi toko terlaris</p>
          </div>
          {selectedSales && (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-amber-200">
              Menampilkan Detail: <strong>{selectedSales}</strong>
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
          {performanceData.map((sales, idx) => {
            const isAboveAverage = sales.totalPacks >= averagePacks;
            const isSelected = selectedSales === sales.name;
            return (
              <motion.div 
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                key={sales.name}
                id={`sales_card_${idx}`}
                onClick={() => setSelectedSales(sales.name)}
                className={`cursor-pointer transition-all duration-200 rounded-xl p-5 flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-amber-500/50 scale-[1.02]' 
                    : 'bg-slate-50 border border-slate-100 hover:border-slate-300 hover:shadow-sm text-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                      isSelected ? 'bg-amber-500 text-slate-900' : 'bg-slate-900 text-amber-400'
                    }`}>
                      {sales.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex items-center gap-1">
                      {idx === 0 && (
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isSelected ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          Top 1
                        </span>
                      )}
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </div>
                  </div>

                  <h5 className={`font-extrabold text-sm mt-3 tracking-tight truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>{sales.name}</h5>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salesperson</p>

                  <div className="mt-4 space-y-2">
                    <div className={`flex justify-between text-xs border-b pb-1.5 ${
                      isSelected ? 'border-white/10' : 'border-slate-200/50'
                    }`}>
                      <span className={`${isSelected ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Capaian:</span>
                      <strong className={`${isSelected ? 'text-amber-400' : 'text-slate-800'} font-bold`}>{sales.totalPacks} Pack</strong>
                    </div>
                    <div className={`flex justify-between text-xs border-b pb-1.5 ${
                      isSelected ? 'border-white/10' : 'border-slate-200/50'
                    }`}>
                      <span className={`${isSelected ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Omset:</span>
                      <strong className={`${isSelected ? 'text-emerald-400' : 'text-emerald-600'} font-bold`}>{formatIDR(sales.totalOmset)}</strong>
                    </div>
                    <div className="flex justify-between text-xs pb-1.5">
                      <span className={`${isSelected ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Sukses Vis:</span>
                      <strong className={`${isSelected ? 'text-indigo-400' : 'text-indigo-600'} font-bold`}>{sales.successRate.toFixed(0)}%</strong>
                    </div>
                  </div>
                </div>

                <div className={`mt-4 pt-3 border-t ${
                  isSelected ? 'border-white/10' : 'border-slate-200/50'
                }`}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold">Status vs Rerata:</span>
                    <span className={`font-bold flex items-center gap-0.5 ${
                      isAboveAverage 
                        ? (isSelected ? 'text-emerald-400' : 'text-emerald-600') 
                        : (isSelected ? 'text-amber-400' : 'text-amber-600')
                    }`}>
                      {isAboveAverage ? 'Di Atas Rerata' : 'Di Bawah Rerata'}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Drill-down Detail Card for Selected Salesperson */}
      {selectedSales && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white border border-slate-800 shadow-lg relative overflow-hidden"
        >
          {/* Decorative background visual */}
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
            <Store className="w-64 h-64 text-white -mr-10 -mb-10" />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-amber-500/30">
                  Salesperson Drill-down
                </span>
              </div>
              <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                Analisis Lokasi Terlaris: <span className="text-amber-400 font-black">{selectedSales}</span>
              </h4>
              <p className="text-xs text-slate-400">
                Menampilkan 3 lokasi toko terlaris dengan volume pembelian tertinggi khusus oleh sales ini.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-semibold shrink-0">
              <span className="text-slate-400">Total Penjualan Sales:</span>
              <strong className="text-amber-400 text-sm">
                {(performanceData.find(s => s.name === selectedSales)?.totalPacks || 0).toLocaleString('id-ID')} Pack
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6 relative z-10">
            {topStoresForSelectedSales.map((store, i) => {
              const rankColors = [
                { bg: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400', badge: 'bg-amber-500 text-slate-950', ring: 'ring-amber-500/20' },
                { bg: 'from-slate-400/20 to-slate-500/5 border-slate-500/30 text-slate-300', badge: 'bg-slate-300 text-slate-900', ring: 'ring-slate-300/20' },
                { bg: 'from-amber-700/20 to-amber-800/5 border-amber-800/30 text-amber-600', badge: 'bg-amber-700 text-white', ring: 'ring-amber-700/20' }
              ];
              const colors = rankColors[i] || { bg: 'from-white/5 to-white/0 border-white/10 text-white', badge: 'bg-slate-700 text-white', ring: 'ring-white/10' };
              
              return (
                <div 
                  key={i} 
                  className={`bg-gradient-to-b ${colors.bg} border rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:scale-[1.01]`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ring-4 ${colors.ring} ${colors.badge}`}>
                        #{i + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
                        {store.count}x Kunjungan Order
                      </span>
                    </div>

                    <h5 className="font-extrabold text-white text-sm mt-4 tracking-tight flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">{store.storeName}</span>
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-start gap-1 line-clamp-2 min-h-[2.5rem]">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{store.storeAddress}</span>
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-white/10 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Volume Terjual</p>
                      <span className="text-base font-black text-white">{store.qtyPacks.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-400">Pack</span></span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Nilai Transaksi</p>
                      <span className="text-xs font-black text-emerald-400">{formatIDR(store.omset)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {topStoresForSelectedSales.length === 0 && (
              <div className="col-span-1 md:col-span-3 py-10 flex flex-col items-center justify-center text-center text-slate-400 bg-white/5 border border-white/10 rounded-2xl">
                <ShoppingBag className="w-10 h-10 text-slate-500 mb-3 animate-bounce" />
                <p className="text-xs font-extrabold text-white">Belum Ada Riwayat Penjualan Sukses</p>
                <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                  Salesperson {selectedSales} belum mencatatkan riwayat pesanan/distribusi yang berhasil di wilayah manapun dalam filter aktif saat ini.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Visual Charts Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Dynamic comparative Bar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Rasio Kompetisi Volume Penjualan</h4>
            <p className="text-xs text-slate-500 mb-6">Perbandingan langsung volume distribusi (Pack) antar sales aktif</p>
          </div>

          <div className="h-72 w-full">
            {performanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} fontWeight={600} tickFormatter={(v) => v.split(' ')[0]} />
                  <YAxis stroke="#94A3B8" fontSize={11} fontWeight={600} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff' }}
                    labelStyle={{ fontWeight: 'bold', color: '#F59E0B', fontSize: '12px' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Bar dataKey="totalPacks" name="Total Pack" radius={[8, 8, 0, 0]}>
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Belum ada transaksi</div>
            )}
          </div>
        </div>

        {/* Sales Timeline Line Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Grafik Tren Penjualan Kronologis</h4>
            <p className="text-xs text-slate-500 mb-6">Perkembangan tren volume harian masing-masing sales</p>
          </div>

          <div className="h-72 w-full">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} fontWeight={600} />
                  <YAxis stroke="#94A3B8" fontSize={10} fontWeight={600} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  {performanceData.map((sales, index) => (
                    <Line
                      key={sales.name}
                      type="monotone"
                      dataKey={sales.name}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2.5}
                      dot={timelineData.length < 15}
                      name={sales.name.split(' ')[0]}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">Belum ada transaksi</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
