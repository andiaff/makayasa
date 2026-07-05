/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  ClipboardCheck, 
  Store, 
  Trophy, 
  Calculator, 
  Code2, 
  History, 
  Settings, 
  LogOut,
  ChevronRight,
  ChevronLeft,
  Coins,
  Package,
  Users,
  Wallet,
  X,
  Menu,
  Map
} from 'lucide-react';

import { AppConfig } from '../types';

interface SidebarProps {
  activeMenu: number;
  setActiveMenu: (menuIndex: number) => void;
  ownerName: string;
  onLogout: () => void;
  mode: 'live' | 'demo';
  isOpenMobile: boolean;
  setIsOpenMobile: (isOpen: boolean) => void;
  isCollapsedTablet: boolean;
  setIsCollapsedTablet: (isCollapsed: boolean) => void;
  config: AppConfig;
  loggedInSalesName?: string;
}

export default function Sidebar({ 
  activeMenu, 
  setActiveMenu, 
  ownerName, 
  onLogout, 
  mode,
  isOpenMobile,
  setIsOpenMobile,
  isCollapsedTablet,
  setIsCollapsedTablet,
  config,
  loggedInSalesName
}: SidebarProps) {
  // Define the 15 Menu items precisely matching owner demands
  const allMenuItems = [
    { id: 1, name: 'Dashboard Utama', desc: 'Ringkasan performa bisnis', icon: LayoutDashboard },
    { id: 2, name: 'Penjualan Sales', desc: 'Kinerja volume & omset sales', icon: TrendingUp },
    { id: 3, name: 'Kunjungan Sales', desc: 'Rasio sukses & status kunjungan', icon: ClipboardCheck },
    { id: 4, name: 'Database Toko', desc: 'Pemetaan toko & loyalitas', icon: Store },
    { id: 16, name: 'Wilayah / Area', desc: 'Pemetaan 31 kecamatan Jember', icon: Map },
    { id: 5, name: 'Leaderboard Sales', desc: 'Rangking & pencapaian target', icon: Trophy },
    { id: 6, name: 'Target & Komisi', desc: 'Kalkulator bonus & insentif', icon: Calculator },
    { id: 10, name: 'Operasional Sales', desc: 'Evaluasi uang operasional sales', icon: Coins },
    { id: 14, name: 'Setoran Sales', desc: 'Catat setoran harian/periodik sales', icon: Wallet },
    { id: 15, name: 'Buku Kas & Keuangan', desc: 'Arus kas masuk, keluar & saldo', icon: Coins },
    { id: 11, name: 'Stok Gudang', desc: 'Catat stok masuk, keluar & sisa', icon: Package },
    { id: 12, name: 'Stok Sales', desc: 'Stok lapangan & penjualan sales', icon: Package },
    { id: 13, name: 'Manajemen Freelance', desc: 'Sirkulasi stok & keuangan freelance', icon: Users },
    { id: 7, name: 'AppScript Sync', desc: 'Panduan & link web-hook', icon: Code2 },
    { id: 8, name: 'Log Transaksi', desc: 'Arsip aktivitas real-time', icon: History },
    { id: 9, name: 'Sistem Pengaturan', desc: 'Konfigurasi harga & sumber data', icon: Settings },
  ];

  // Filter menu items for Sales accounts (only show 1, 2, 3, 4, 12, 14)
  const menuItems = loggedInSalesName
    ? allMenuItems.filter(item => [1, 2, 3, 4, 12, 14].includes(item.id))
    : allMenuItems;

  const handleMenuClick = (id: number) => {
    setActiveMenu(id);
    // Automatically close mobile drawer after selecting
    setIsOpenMobile(false);
  };

  const isCollapsed = isCollapsedTablet;

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Main Sidebar Panel */}
      <aside 
        id="sidebar_nav" 
        className={`
          fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-screen transition-all duration-300
          lg:sticky lg:top-0 lg:z-20
          ${isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[84px]' : 'lg:w-[280px]'}
          w-72
        `}
      >
        {/* Brand Header */}
        <div className={`p-4 border-b border-slate-800 flex flex-col justify-between ${isCollapsed ? 'lg:p-3' : 'lg:p-5'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-md shadow-amber-500/20 shrink-0">
                {config.brandLogoInitials || 'MY'}
              </div>
              <div className={`transition-opacity duration-200 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                <h1 className="text-white font-bold font-sans text-sm leading-tight tracking-tight uppercase">{config.brandName || 'Makayasa Jember'}</h1>
                <p className="text-[10px] text-amber-500 font-extrabold tracking-widest uppercase">{config.brandSubtitle || 'Komandan'}</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsOpenMobile(false)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white lg:hidden transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Tablet/Desktop Collapse Toggle Icon */}
            <button
              onClick={() => setIsCollapsedTablet(!isCollapsedTablet)}
              className="hidden lg:flex p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-lg transition-all"
              title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Connection status badge */}
          <div className={`mt-4 flex items-center justify-between bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-800 ${isCollapsed ? 'lg:hidden' : 'flex'}`}>
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Status</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${mode === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="text-xs font-semibold text-white capitalize">{mode === 'live' ? 'Live' : 'Demo'}</span>
            </div>
          </div>
        </div>

        {/* Menu Options Scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          <div className={`text-[9px] uppercase font-black tracking-widest text-slate-500 px-3 mb-2 transition-opacity duration-200 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
            {loggedInSalesName ? '6 Menu Utama Sales' : '16 Menu Utama Komandan'}
          </div>
          
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar_menu_${item.id}`}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center rounded-xl transition-all duration-200 text-left relative group py-2.5 px-3 min-h-[44px] hover:scale-[1.015] active:scale-[0.985] ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/15' 
                    : 'hover:bg-slate-800/60 hover:text-white text-slate-400'
                } ${isCollapsed ? 'lg:justify-center' : 'gap-3'}`}
                title={item.name}
              >
                {/* Subtle Amber indicator on hover */}
                {!isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-amber-500 scale-y-0 group-hover:scale-y-100 opacity-0 group-hover:opacity-100 transition-all duration-200" />
                )}

                <div className={`p-1.5 rounded-lg shrink-0 transition-all duration-200 ${
                  isActive 
                    ? 'bg-slate-900/15 text-slate-950' 
                    : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700/80 group-hover:text-white group-hover:scale-105'
                }`}>
                  <IconComponent className="w-4.5 h-4.5 transition-transform duration-200 group-hover:rotate-3" />
                </div>
                
                <div className={`flex-1 min-w-0 transition-opacity duration-200 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                  <p className={`text-xs truncate transition-all duration-200 group-hover:translate-x-0.5 ${
                    isActive ? 'text-slate-950 font-black' : 'text-slate-200 group-hover:text-white group-hover:font-medium'
                  }`}>
                    {item.name}
                  </p>
                  <p className={`text-[10px] truncate transition-all duration-200 ${
                    isActive ? 'text-slate-800 font-semibold' : 'text-slate-500 group-hover:text-slate-400'
                  }`}>
                    {item.desc}
                  </p>
                </div>
                
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-all duration-200 ${
                  isCollapsed ? 'lg:hidden' : 'block'
                } ${
                  isActive 
                    ? 'text-slate-950 scale-110' 
                    : 'text-slate-600 group-hover:text-white group-hover:translate-x-0.5'
                }`} />
              </button>
            );
          })}
        </div>

        {/* Owner User Card */}
        <div className={`p-3 border-t border-slate-800 bg-slate-950 flex flex-col gap-2 ${isCollapsed ? 'lg:items-center' : ''}`}>
          <div className={`flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800/80 ${isCollapsed ? 'lg:justify-center lg:w-11 lg:h-11 lg:p-0' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-white font-bold text-xs shrink-0" title={ownerName}>
              {loggedInSalesName 
                ? ownerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                : (config.ownerInitials || 'OW')}
            </div>
            <div className={`flex-1 min-w-0 transition-opacity duration-200 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              <p className="text-xs font-black text-white truncate">{ownerName}</p>
              <p className="text-[10px] text-slate-500 truncate">
                {loggedInSalesName ? 'Sales Lapangan' : (config.ownerRole || 'Komandan Perusahaan')}
              </p>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            id="sidebar_logout_btn"
            className={`py-2 hover:bg-red-950/40 border border-transparent hover:border-red-900/50 rounded-xl text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
              isCollapsed ? 'lg:w-11 lg:p-0' : 'w-full px-3'
            }`}
            title="Keluar"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={`${isCollapsed ? 'lg:hidden' : 'inline'}`}>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
