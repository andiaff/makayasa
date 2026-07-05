/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  ShoppingBag, 
  MapPin, 
  Percent, 
  BarChart3, 
  Users, 
  Store,
  ChevronRight,
  ArrowUpRight,
  Package
} from 'lucide-react';
import { Transaction } from '../types';
import { formatIDR } from '../utils/spreadsheetParser';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  onNavigateToMenu: (menuId: number) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: 'spring', 
      stiffness: 100, 
      damping: 16,
      mass: 0.8
    } 
  }
};

export default function Dashboard({ transactions, onNavigateToMenu }: DashboardProps) {
  const [activeMetric, setActiveMetric] = React.useState<'packs' | 'omset' | 'both'>('packs');
  const [chartType, setChartType] = React.useState<'area' | 'bar'>('area');
  const [hoveredSalesIndex, setHoveredSalesIndex] = React.useState<number | null>(null);
  const [timeRange, setTimeRange] = React.useState<'daily' | 'monthly'>('daily');
  
  // Calculate high-level stats
  const totalOmset = transactions.reduce((acc, curr) => acc + curr.omset, 0);
  const totalPacks = transactions.reduce((acc, curr) => acc + curr.qtyPacks, 0);
  const totalVisits = transactions.length;
  const orderedStoresCount = transactions.filter(tx => tx.statusKunjungan !== 'Tidak Order').length;
  
  // Success conversion rate
  const successRate = totalVisits > 0 ? (orderedStoresCount / totalVisits) * 100 : 0;

  // Regular orders vs repeat orders
  const regularOrdersCount = transactions.filter(tx => tx.statusKunjungan === 'Baru Order' || (tx.statusKunjungan as string) === 'Order').length;
  const repeatStoresCount = transactions.filter(tx => tx.statusKunjungan === 'Repeat Order').length;

  // Prepare chart data: Sales per day
  const getDailySalesData = () => {
    const dailyMap: Record<string, { date: string; packs: number; omset: number }> = {};
    
    // Sort transactions ascending for chart chronological order
    const sortedTx = [...transactions].sort((a, b) => a.tanggal.getTime() - b.tanggal.getTime());
    
    sortedTx.forEach(tx => {
      // Format to DD/MM
      const day = tx.tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, packs: 0, omset: 0 };
      }
      dailyMap[day].packs += tx.qtyPacks;
      dailyMap[day].omset += tx.omset;
    });

    return Object.values(dailyMap);
  };

  // Prepare chart data: Sales per month
  const getMonthlySalesData = () => {
    const monthlyMap: Record<string, { date: string; packs: number; omset: number; monthSort: number }> = {};
    
    // Sort transactions ascending for chart chronological order
    const sortedTx = [...transactions].sort((a, b) => a.tanggal.getTime() - b.tanggal.getTime());
    
    sortedTx.forEach(tx => {
      const monthStr = tx.tanggal.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const sortKey = tx.tanggal.getFullYear() * 12 + tx.tanggal.getMonth();
      if (!monthlyMap[monthStr]) {
        monthlyMap[monthStr] = { date: monthStr, packs: 0, omset: 0, monthSort: sortKey };
      }
      monthlyMap[monthStr].packs += tx.qtyPacks;
      monthlyMap[monthStr].omset += tx.omset;
    });

    return Object.values(monthlyMap).sort((a, b) => a.monthSort - b.monthSort);
  };

  // Prepare chart data: Contribution per Salesperson
  const getSalesmanContributionData = () => {
    const salesMap: Record<string, { name: string; value: number; omset: number }> = {};
    
    transactions.forEach(tx => {
      if (tx.qtyPacks > 0) {
        if (!salesMap[tx.salesName]) {
          salesMap[tx.salesName] = { name: tx.salesName, value: 0, omset: 0 };
        }
        salesMap[tx.salesName].value += tx.qtyPacks;
        salesMap[tx.salesName].omset += tx.omset;
      }
    });

    return Object.values(salesMap);
  };

  const chartData = timeRange === 'daily' ? getDailySalesData() : getMonthlySalesData();
  const contributionData = getSalesmanContributionData();

  // Premium Cohesive Palette
  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6'];

  // Custom high-fidelity tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800 p-3.5 rounded-xl shadow-2xl space-y-2">
          <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            {timeRange === 'daily' ? 'Tanggal' : 'Bulan'}: {label}
          </p>
          <div className="space-y-1.5 border-t border-slate-800/60 pt-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-4 justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                  <span className="text-slate-300 font-medium">{entry.name}:</span>
                </div>
                <span className="font-bold text-white font-mono">
                  {entry.name.includes('Omset') ? formatIDR(entry.value) : `${entry.value.toLocaleString('id-ID')} Pack`}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      id="dashboard_view" 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* SECTION: METRIK UTAMA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Metrik Utama & Analisis Distribusi
          </h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5">
        
        {/* Card 1: Total Omset */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.1)' }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Omset (Rp)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight font-mono">
              {formatIDR(totalOmset)}
            </h3>
            <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-0.5">
              <span>● Pendapatan Kotor Aktual</span>
            </p>
          </div>
        </motion.div>

        {/* Card 2: Total Penjualan */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.1)' }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rokok Terjual</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {totalPacks.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-400">Pack</span>
            </h3>
            <p className="text-[10px] text-amber-600 font-bold mt-1.5">
              Tarif Standard: Rp 6.000 / pack
            </p>
          </div>
        </motion.div>

        {/* Card 3: Total Kunjungan */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.1)' }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kunjungan Toko</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {totalVisits.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-400">Kali</span>
            </h3>
            <p className="text-[10px] text-indigo-600 font-bold mt-1.5">
              Cakupan Distribusi Salesman
            </p>
          </div>
        </motion.div>

        {/* Card 4: Toko Order */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(6, 182, 212, 0.1)' }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outlet Aktif</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {orderedStoresCount.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-400">Toko</span>
            </h3>
            <p className="text-[10px] text-cyan-600 font-bold mt-1.5">
              {regularOrdersCount} Order &bull; {repeatStoresCount} RO
            </p>
          </div>
        </motion.div>

        {/* Card 5: Success Rate */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.1)' }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between transition-all col-span-2 md:col-span-1 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rasio Sukses</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
              {successRate.toFixed(1)}%
            </h3>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${successRate}%` }}></div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Sales trend chart */}
        <motion.div 
          variants={itemVariants}
          className="xl:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase">Tren Kinerja Penjualan Berkala</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {timeRange === 'daily' 
                    ? 'Analisis harian volume penjualan dan akumulasi omset distribusi' 
                    : 'Analisis tren bulanan volume penjualan dan pertumbuhan omset kumulatif'}
                </p>
              </div>
              
              {/* Controls layout */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Time Range Toggle */}
                <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-[10px] font-bold">
                  <button 
                    onClick={() => setTimeRange('daily')}
                    className={`px-3 py-1.5 rounded-md transition-all ${timeRange === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Harian
                  </button>
                  <button 
                    onClick={() => setTimeRange('monthly')}
                    className={`px-3 py-1.5 rounded-md transition-all ${timeRange === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Bulanan
                  </button>
                </div>

                {/* Metric Selector Pills */}
                <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-[10px] font-bold">
                  <button 
                    onClick={() => setActiveMetric('packs')}
                    className={`px-3 py-1.5 rounded-md transition-all ${activeMetric === 'packs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Volume (Pack)
                  </button>
                  <button 
                    onClick={() => setActiveMetric('omset')}
                    className={`px-3 py-1.5 rounded-md transition-all ${activeMetric === 'omset' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Omset (Rp)
                  </button>
                  <button 
                    onClick={() => setActiveMetric('both')}
                    className={`px-3 py-1.5 rounded-md transition-all ${activeMetric === 'both' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Kombinasi
                  </button>
                </div>

                {/* Chart Type Toggle */}
                {activeMetric !== 'both' && (
                  <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-[10px] font-bold">
                    <button 
                      onClick={() => setChartType('area')}
                      className={`px-2 py-1.5 rounded-md transition-all ${chartType === 'area' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Area
                    </button>
                    <button 
                      onClick={() => setChartType('bar')}
                      className={`px-2 py-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Bar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-80 w-full mt-2 relative overflow-hidden">
            {chartData.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeMetric}-${chartType}-${timeRange}`}
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    {activeMetric === 'both' ? (
                      // Combo Area + Bar with Dual Axis
                      <AreaChart data={chartData} margin={{ top: 10, right: -5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPacks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity={0.32}/>
                            <stop offset="50%" stopColor="#6366F1" stopOpacity={0.12}/>
                            <stop offset="100%" stopColor="#6366F1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOmset" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.32}/>
                            <stop offset="50%" stopColor="#10B981" stopOpacity={0.12}/>
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} fontWeight={700} tickLine={false} />
                        <YAxis yAxisId="left" stroke="#6366F1" fontSize={10} fontWeight={700} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10B981" fontSize={10} fontWeight={700} tickLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area yAxisId="left" type="monotone" dataKey="packs" name="Volume Penjualan" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorPacks)" animationDuration={1000} />
                        <Area yAxisId="right" type="monotone" dataKey="omset" name="Total Omset" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorOmset)" animationDuration={1000} />
                      </AreaChart>
                    ) : chartType === 'area' ? (
                      <AreaChart data={chartData} margin={{ top: 10, right: -10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="selectedMetricGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={activeMetric === 'packs' ? '#F59E0B' : '#10B981'} stopOpacity={0.32}/>
                            <stop offset="50%" stopColor={activeMetric === 'packs' ? '#F59E0B' : '#10B981'} stopOpacity={0.12}/>
                            <stop offset="100%" stopColor={activeMetric === 'packs' ? '#F59E0B' : '#10B981'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} fontWeight={700} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={10} fontWeight={700} tickLine={false} tickFormatter={activeMetric === 'omset' ? (v) => `${(v/1000).toFixed(0)}rb` : undefined} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey={activeMetric} 
                          name={activeMetric === 'packs' ? 'Volume (Pack)' : 'Omset Penjualan'} 
                          stroke={activeMetric === 'packs' ? '#F59E0B' : '#10B981'} 
                          strokeWidth={3.5} 
                          fillOpacity={1} 
                          fill="url(#selectedMetricGlow)" 
                          animationDuration={1000}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={chartData} margin={{ top: 10, right: -10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="barGradientPacks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F59E0B" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#D97706" stopOpacity={0.65}/>
                          </linearGradient>
                          <linearGradient id="barGradientOmset" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.65}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} fontWeight={700} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={10} fontWeight={700} tickLine={false} tickFormatter={activeMetric === 'omset' ? (v) => `${(v/1000).toFixed(0)}rb` : undefined} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar 
                          dataKey={activeMetric} 
                          name={activeMetric === 'packs' ? 'Volume (Pack)' : 'Omset Penjualan'} 
                          fill={activeMetric === 'packs' ? 'url(#barGradientPacks)' : 'url(#barGradientOmset)'} 
                          radius={[6, 6, 0, 0]}
                          maxBarSize={45}
                          animationDuration={800}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <BarChart3 className="w-8 h-8 opacity-30" />
                <span className="text-xs font-semibold">Tidak ada data transaksi untuk tanggal ini</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Share of market per sales */}
        <motion.div 
          variants={itemVariants}
          className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">Kontribusi Pasar Sales</h4>
            <p className="text-xs text-slate-400 mb-6">Pangsa volume penjualan rokok (Pack) masing-masing sales</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center relative">
            {contributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(_, index) => setHoveredSalesIndex(index)}
                    onMouseLeave={() => setHoveredSalesIndex(null)}
                    animationDuration={1000}
                  >
                    {contributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        opacity={hoveredSalesIndex === null || hoveredSalesIndex === index ? 1 : 0.4}
                        style={{ transition: 'all 0.3s ease', cursor: 'pointer', outline: 'none' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400 font-semibold">Belum ada kontribusi order</div>
            )}
            
            {/* Center stat inside donut chart */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Terjual</span>
              <span className="text-xl font-black text-slate-800 tracking-tight font-mono">{totalPacks.toLocaleString('id-ID')}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pack</span>
            </div>
          </div>

          {/* Interactive Bento Legend mapping */}
          <div className="space-y-2.5 mt-4 border-t border-slate-50 pt-4">
            {contributionData.map((item, index) => {
              const pct = totalPacks > 0 ? (item.value / totalPacks) * 100 : 0;
              const isHovered = hoveredSalesIndex === index;
              return (
                <div 
                  key={item.name} 
                  onMouseEnter={() => setHoveredSalesIndex(index)}
                  onMouseLeave={() => setHoveredSalesIndex(null)}
                  className={`p-1.5 rounded-lg transition-all ${isHovered ? 'bg-slate-50 scale-[1.02]' : 'bg-transparent'} cursor-pointer`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-bold text-slate-700">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-400 text-[11px]">{item.value.toLocaleString('id-ID')} Pack</span>
                      <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded text-[10px]">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  {/* Visual micro progress bar */}
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ 
                        backgroundColor: COLORS[index % COLORS.length],
                        width: `${pct}%`,
                        opacity: isHovered ? 1 : 0.75
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>

      {/* Bottom Quick-access Dashboard Panel */}
      <motion.div 
        variants={itemVariants}
        className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-base font-bold text-amber-400">Analisis Wilayah & Leaderboard Sales</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Lihat ranking performa masing-masing sales secara komprehensif, evaluasi pencapaian target kunjungan, dan ketahui wilayah distribusi dengan repeat order tertinggi.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateToMenu(5)}
              id="dash_btn_lead"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <span>Buka Leaderboard</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateToMenu(4)}
              id="dash_btn_store"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>Database Toko</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

    </motion.div>);
}
