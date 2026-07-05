/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Database, 
  Cigarette, 
  AlertCircle, 
  HelpCircle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Download,
  Upload,
  Share2,
  Smartphone,
  Laptop,
  Cloud,
  CloudOff,
  Activity,
  Server
} from 'lucide-react';
import { AppConfig, SalesAccount } from '../types';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { 
  initializeFirebaseSync, 
  disableFirebaseSync, 
  forceManualSync, 
  getCloudStats 
} from '../utils/firebaseSync';

interface SistemPengaturanProps {
  config: AppConfig;
  setConfig: (config: AppConfig) => void;
  onResetToDefault: () => void;
}

export default function SistemPengaturan({ config, setConfig, onResetToDefault }: SistemPengaturanProps) {
  const [spreadsheetInput, setSpreadsheetInput] = useState(config.spreadsheetUrl);
  const [priceInput, setPriceInput] = useState(config.pricePerPack);
  const [modeInput, setModeInput] = useState<'live' | 'demo'>(config.mode);
  
  // Brand & profile customization state inputs
  const [brandName, setBrandName] = useState(config.brandName || 'MAKAYASA JEMBER');
  const [brandSubtitle, setBrandSubtitle] = useState(config.brandSubtitle || 'KOMANDAN');
  const [brandLogoInitials, setBrandLogoInitials] = useState(config.brandLogoInitials || 'MY');
  const [ownerName, setOwnerName] = useState(config.ownerName || 'Komandan Makayasa');
  const [ownerRole, setOwnerRole] = useState(config.ownerRole || 'Komandan Perusahaan');
  const [ownerInitials, setOwnerInitials] = useState(config.ownerInitials || 'KM');
  
  // Login credentials state inputs
  const [loginUsername, setLoginUsername] = useState(config.loginUsername || 'komandan');
  const [loginPassword, setLoginPassword] = useState(config.loginPassword || 'makayasajaya');

  // Sales accounts state inputs
  const [salesAccounts, setSalesAccounts] = useState<SalesAccount[]>(config.salesAccounts || []);
  const [newSalesName, setNewSalesName] = useState('');
  const [newSalesUser, setNewSalesUser] = useState('');
  const [newSalesPass, setNewSalesPass] = useState('');
  const [salesError, setSalesError] = useState('');

  // Sync local salesAccounts state when config.salesAccounts updates from elsewhere or on mount
  useEffect(() => {
    if (config.salesAccounts) {
      setSalesAccounts(config.salesAccounts);
    }
  }, [config.salesAccounts]);

  const [saved, setSaved] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Cloud Sync states
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('makayasa_cloud_sync_enabled') !== 'false';
  });
  const [syncing, setSyncing] = useState(false);
  const [dbStats, setDbStats] = useState<Record<string, number> | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch Stats on mount or when cloud sync is enabled
  useEffect(() => {
    if (cloudSyncEnabled) {
      getCloudStats().then(stats => {
        setDbStats(stats);
      });
    }
  }, [cloudSyncEnabled]);

  const toggleCloudSync = () => {
    const nextVal = !cloudSyncEnabled;
    setCloudSyncEnabled(nextVal);
    localStorage.setItem('makayasa_cloud_sync_enabled', String(nextVal));
    if (nextVal) {
      initializeFirebaseSync();
      getCloudStats().then(stats => setDbStats(stats));
    } else {
      disableFirebaseSync();
      setDbStats(null);
    }
  };

  const handleManualCloudSync = async () => {
    setSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await forceManualSync();
      if (res.success) {
        setSyncStatusMsg({ text: res.message, type: 'success' });
        const stats = await getCloudStats();
        setDbStats(stats);
      } else {
        setSyncStatusMsg({ text: res.message, type: 'error' });
      }
    } catch (err: any) {
      setSyncStatusMsg({ text: `Gagal: ${err.message || err}`, type: 'error' });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    }
  };


  // 1. Export Data to JSON File
  const handleExportData = () => {
    try {
      const keysToBackup = [
        'makayasa_expenses',
        'makayasa_sales_deposits',
        'makayasa_freelance_records',
        'makayasa_stok_gudang',
        'makayasa_min_stock_alert',
        'makayasa_owner_config',
        'makayasa_owner_session'
      ];
      
      const backupData: Record<string, string | null> = {};
      keysToBackup.forEach(key => {
        backupData[key] = localStorage.getItem(key);
      });
      
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataUri);
      
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('download', `cadangan_makayasa_jaya_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      setBackupMessage({ text: 'Berhasil mengekspor cadangan data! Silakan bagikan file .json ini ke laptop/perangkat lain Anda.', type: 'success' });
      setTimeout(() => setBackupMessage(null), 5000);
    } catch (err: any) {
      setBackupMessage({ text: `Gagal mengekspor data: ${err.message || err}`, type: 'error' });
    }
  };

  // 2. Import Data from JSON File
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Simple verification that this is indeed our backup file
        const hasValidKeys = Object.keys(parsed).some(key => key.startsWith('makayasa_'));
        if (!hasValidKeys) {
          throw new Error('Format file cadangan tidak valid. Pastikan Anda mengunggah file .json yang diekspor dari aplikasi ini.');
        }

        // Save keys back to localStorage
        Object.entries(parsed).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            localStorage.setItem(key, value as string);
          }
        });

        setBackupMessage({ text: 'Berhasil mengimpor cadangan! Sistem akan memuat ulang halaman ini dalam 2 detik untuk menerapkan data...', type: 'success' });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (err: any) {
        setBackupMessage({ text: `Gagal mengimpor file: ${err.message || err}`, type: 'error' });
      }
    };
    
    fileReader.readAsText(file);
  };

  const handleAddSalesAccount = () => {
    setSalesError('');
    if (!newSalesName.trim()) {
      setSalesError('Nama Sales tidak boleh kosong.');
      return;
    }
    if (!newSalesUser.trim()) {
      setSalesError('Username tidak boleh kosong.');
      return;
    }
    if (!newSalesPass.trim()) {
      setSalesError('Kata Sandi tidak boleh kosong.');
      return;
    }

    // Check if username already exists
    const userExists = salesAccounts.some(
      sa => sa.username.toLowerCase().trim() === newSalesUser.toLowerCase().trim()
    );
    if (userExists || newSalesUser.toLowerCase().trim() === loginUsername.toLowerCase().trim()) {
      setSalesError('Username sudah digunakan.');
      return;
    }

    const newAcc: SalesAccount = {
      id: `sales-${Date.now()}`,
      salesName: newSalesName.trim(),
      username: newSalesUser.trim(),
      password: newSalesPass.trim()
    };

    const updatedAccounts = [...salesAccounts, newAcc];
    setSalesAccounts(updatedAccounts);
    setNewSalesName('');
    setNewSalesUser('');
    setNewSalesPass('');

    // Auto-save immediately to the application configuration
    setConfig({
      ...config,
      salesAccounts: updatedAccounts
    });
  };

  const handleRemoveSalesAccount = (id: string) => {
    const updatedAccounts = salesAccounts.filter(sa => sa.id !== id);
    setSalesAccounts(updatedAccounts);
    
    // Auto-save immediately to the application configuration
    setConfig({
      ...config,
      salesAccounts: updatedAccounts
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setConfig({
      ...config,
      spreadsheetUrl: spreadsheetInput,
      pricePerPack: priceInput,
      mode: modeInput,
      brandName,
      brandSubtitle,
      brandLogoInitials,
      ownerName,
      ownerRole,
      ownerInitials,
      loginUsername,
      loginPassword,
      salesAccounts
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div id="pengaturan_view" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Settings Form Card */}
      <form onSubmit={handleSave} className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            <span>Sistem Pengaturan Command Center</span>
          </h4>
          <p className="text-xs text-slate-500 mt-1">Konfigurasi sumber data spreadsheets, harga barang jualan, dan mode aplikasi</p>
        </div>

        {saved && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Pengaturan berhasil disimpan dan diterapkan!</span>
          </motion.div>
        )}

        {/* Input: Mode Toggle */}
        <div className="space-y-2 border-b border-slate-100 pb-5">
          <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Mode Sumber Data:</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              id="set_mode_demo"
              onClick={() => setModeInput('demo')}
              className={`p-4 rounded-xl text-xs font-bold text-left border flex flex-col justify-between h-24 transition-all ${
                modeInput === 'demo'
                  ? 'bg-amber-50/50 border-amber-500 text-amber-950'
                  : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Database className="w-5 h-5" />
              <div>
                <span className="block font-black text-sm">Demo Mode</span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Simulasi data lokal 350+ baris</span>
              </div>
            </button>
            <button
              type="button"
              id="set_mode_live"
              onClick={() => setModeInput('live')}
              className={`p-4 rounded-xl text-xs font-bold text-left border flex flex-col justify-between h-24 transition-all ${
                modeInput === 'live'
                  ? 'bg-indigo-50/50 border-indigo-500 text-indigo-950'
                  : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
              <div>
                <span className="block font-black text-sm">Live Google Sheet</span>
                <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Ambil data langsung dari link spreadsheet</span>
              </div>
            </button>
          </div>
        </div>

        {/* Input: Spreadsheet Link */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Link Google Spreadsheet:</label>
          <input
            type="url"
            id="set_spreadsheet_url"
            value={spreadsheetInput}
            onChange={(e) => setSpreadsheetInput(e.target.value)}
            placeholder="Masukkan link Google Spreadsheet..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 font-mono"
          />
          <span className="text-[10px] text-slate-400 block font-medium">Contoh: https://docs.google.com/spreadsheets/d/1ZS6Zk0vPlMER19uRdPLZHiXReZNnJsMwdaZhFZdCeus/edit...</span>
        </div>

        {/* Input: Price of Rokok Makayasa per pack */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">Harga Rokok Makayasa (per Pak):</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 font-bold text-xs font-mono">Rp</span>
            <input
              type="number"
              id="set_price_per_pack"
              value={priceInput}
              onChange={(e) => setPriceInput(parseInt(e.target.value, 10) || 0)}
              placeholder="6000"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
            />
          </div>
          <span className="text-[10px] text-slate-400 block font-medium">Beban omset penjualan dihitung berdasarkan: <strong>Volume Penjualan * Harga Jual per Pack</strong></span>
        </div>

        {/* SECTION: BRAND & PROFILE CUSTOMIZATION */}
        <div className="pt-5 border-t border-slate-100 space-y-4">
          <div>
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kustomisasi Identitas Brand & Profil</h5>
            <p className="text-[10px] text-slate-500 mt-0.5">Ubah nama perusahaan, inisial logo, dan identitas komandan yang ditampilkan di sidebar</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">Nama Brand/Perusahaan:</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="MAKAYASA JEMBER"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">Subtitle Brand Sidebar:</label>
              <input
                type="text"
                value={brandSubtitle}
                onChange={(e) => setBrandSubtitle(e.target.value)}
                placeholder="KOMANDAN"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">Inisial Logo (Maks 2 Karakter):</label>
              <input
                type="text"
                maxLength={2}
                value={brandLogoInitials}
                onChange={(e) => setBrandLogoInitials(e.target.value.toUpperCase())}
                placeholder="MY"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">Nama Lengkap Komandan:</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Komandan Makayasa"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">Peran/Jabatan Komandan:</label>
              <input
                type="text"
                value={ownerRole}
                onChange={(e) => setOwnerRole(e.target.value)}
                placeholder="Komandan Perusahaan"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">Inisial Profil (Maks 2 Karakter):</label>
              <input
                type="text"
                maxLength={2}
                value={ownerInitials}
                onChange={(e) => setOwnerInitials(e.target.value.toUpperCase())}
                placeholder="KM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* SECTION: ACCOUNT CREDENTIALS */}
        <div className="pt-5 border-t border-slate-100 space-y-4">
          <div>
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kredensial Keamanan Akun (Login Komandan)</h5>
            <p className="text-[10px] text-slate-500 mt-0.5">Atur username dan kata sandi baru untuk masuk ke Command Center ini</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">Username Baru:</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="komandan"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">Kata Sandi Baru:</label>
              <input
                type="text"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="makayasajaya"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION: SALES ACCOUNT MANAGEMENT */}
        <div className="pt-5 border-t border-slate-100 space-y-4">
          <div>
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Pengaturan Akun Sales Lapangan</span>
            </h5>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Tambahkan hingga 5 atau lebih akun sales dengan password khusus agar sales dapat login dan fokus memantau data milik mereka sendiri.
            </p>
          </div>

          {/* Form to add a Sales Account */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">Tambah Akun Sales Baru</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 block">Nama Sales (Sesuai Spreadsheet):</label>
                <input
                  type="text"
                  value={newSalesName}
                  onChange={(e) => setNewSalesName(e.target.value)}
                  placeholder="Contoh: Rico"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 block">Username Login:</label>
                <input
                  type="text"
                  value={newSalesUser}
                  onChange={(e) => setNewSalesUser(e.target.value)}
                  placeholder="Contoh: rico"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-700 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 block">Kata Sandi:</label>
                <input
                  type="text"
                  value={newSalesPass}
                  onChange={(e) => setNewSalesPass(e.target.value)}
                  placeholder="rico123"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-700 font-mono"
                />
              </div>
            </div>

            {salesError && (
              <p className="text-[10px] text-red-600 font-bold">{salesError}</p>
            )}

            <button
              type="button"
              onClick={handleAddSalesAccount}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] shadow-sm flex items-center gap-1.5 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Tambah Akun Sales
            </button>
          </div>

          {/* List of active Sales Accounts */}
          {salesAccounts.length > 0 ? (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="px-4 py-2">Nama Sales (Data)</th>
                    <th className="px-4 py-2">Username</th>
                    <th className="px-4 py-2">Kata Sandi</th>
                    <th className="px-4 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                  {salesAccounts.map((sa) => (
                    <tr key={sa.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{sa.salesName}</td>
                      <td className="px-4 py-2.5 font-mono">{sa.username}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">{sa.password}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveSalesAccount(sa.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
              Belum ada akun sales yang dibuat. Silakan tambahkan di atas.
            </div>
          )}
        </div>

        {/* Action Button save */}
        <div className="flex gap-3 pt-5 border-t border-slate-100">
          <button
            type="submit"
            id="btn_save_config"
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-98"
          >
            Simpan Konfigurasi
          </button>
          <button
            type="button"
            id="btn_reset_config"
            onClick={() => {
              onResetToDefault();
              setSpreadsheetInput('https://docs.google.com/spreadsheets/d/1ZS6Zk0vPlMER19uRdPLZHiXReZNnJsMwdaZhFZdCeus/edit');
              setPriceInput(6000);
              setModeInput('demo');
              setBrandName('MAKAYASA JEMBER');
              setBrandSubtitle('KOMANDAN');
              setBrandLogoInitials('MY');
              setOwnerName('Komandan Makayasa');
              setOwnerRole('Komandan Perusahaan');
              setOwnerInitials('KM');
              setLoginUsername('komandan');
              setLoginPassword('makayasajaya');
            }}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-all border border-slate-200"
          >
            Reset Default
          </button>
        </div>
      </form>

      {/* Information side cards (1/3 width) */}
      <div className="space-y-6">
        
        {/* Card Sinkronisasi Cloud (Firebase Firestore) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud className="text-amber-500 w-5 h-5 shrink-0" />
              <span>Sinkronisasi Cloud (Firebase)</span>
            </h4>
            
            {/* Status indicator with pulsing animation */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {cloudSyncEnabled ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-300 dark:bg-slate-600"></span>
                )}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${cloudSyncEnabled ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>
                {cloudSyncEnabled ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            Aktifkan fitur sinkronisasi cloud untuk menyimpan data secara otomatis dan aman di database Firestore. Ini memungkinkan data setoran, kas, pengeluaran, dan stok Anda sinkron secara real-time di semua HP & Laptop Anda!
          </p>

          {/* Cloud Toggle Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2.5">
              {cloudSyncEnabled ? (
                <Server className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <CloudOff className="w-5 h-5 text-slate-400 shrink-0" />
              )}
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">Status Sinkronisasi</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block mt-0.5 truncate">
                  {cloudSyncEnabled ? 'Real-time aktif & memantau data' : 'Data hanya disimpan lokal di browser'}
                </span>
              </div>
            </div>

            {/* Premium Toggle Switch Button */}
            <button
              type="button"
              onClick={toggleCloudSync}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${cloudSyncEnabled ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-100 shadow ring-0 transition duration-200 ease-in-out ${cloudSyncEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Sync Stats - ONLY show when active */}
          {cloudSyncEnabled && dbStats && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Catatan Terdeteksi di Cloud:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 font-mono">
                <div className="flex justify-between border-r border-slate-200 dark:border-slate-800 pr-2">
                  <span>Setoran:</span>
                  <span className="font-bold text-amber-500">{dbStats.sales_deposits ?? 0}</span>
                </div>
                <div className="flex justify-between pl-1">
                  <span>Pengeluaran:</span>
                  <span className="font-bold text-amber-500">{dbStats.expenses ?? 0}</span>
                </div>
                <div className="flex justify-between border-r border-slate-200 dark:border-slate-800 pr-2 pt-1">
                  <span>Freelance:</span>
                  <span className="font-bold text-amber-500">{dbStats.freelance_records ?? 0}</span>
                </div>
                <div className="flex justify-between pl-1 pt-1">
                  <span>Stok:</span>
                  <span className="font-bold text-amber-500">{dbStats.stok_gudang ?? 0}</span>
                </div>
              </div>
            </div>
          )}

          {syncStatusMsg && (
            <div className={`p-3 rounded-xl text-xs font-bold ${
              syncStatusMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-150 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/25 border border-rose-150 dark:border-rose-800/60 text-rose-800 dark:text-rose-400'
            }`}>
              {syncStatusMsg.text}
            </div>
          )}

          {/* Manual Force Sync Button */}
          <button
            type="button"
            disabled={!cloudSyncEnabled || syncing}
            onClick={handleManualCloudSync}
            className={`w-full py-2.5 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
              cloudSyncEnabled 
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-98' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sinkronisasi Ulang...' : 'Sinkronkan Sekarang'}</span>
          </button>
        </div>

        {/* Card Sinkronisasi Antar Perangkat */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="text-indigo-500 w-5 h-5" />
            <span>Sinkronisasi HP & Laptop</span>
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Karena data input (seperti setoran, stok, kas) disimpan aman di memori lokal masing-masing perangkat (browser), Anda bisa mentransfer data dari HP ke Laptop agar sama persis secara instan:
          </p>

          <div className="flex items-center justify-around bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex flex-col items-center gap-1">
              <Smartphone className="w-5 h-5 text-slate-600" />
              <span className="text-[10px] font-bold text-slate-500">HP (Mobile)</span>
            </div>
            <div className="text-xs font-bold text-indigo-500 animate-pulse">➔ transfer file .json ➔</div>
            <div className="flex flex-col items-center gap-1">
              <Laptop className="w-5 h-5 text-slate-600" />
              <span className="text-[10px] font-bold text-slate-500">Laptop (PC)</span>
            </div>
          </div>

          {backupMessage && (
            <div className={`p-3 rounded-xl text-xs font-bold ${
              backupMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-150 text-emerald-800' : 'bg-rose-50 border border-rose-150 text-rose-800'
            }`}>
              {backupMessage.text}
            </div>
          )}

          <div className="space-y-2 pt-1">
            {/* Download/Export Button */}
            <button
              type="button"
              onClick={handleExportData}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Ekspor Cadangan Data (.json)
            </button>

            {/* Upload/Import Button */}
            <label className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
              <Upload className="w-4 h-4" />
              <span>Impor Cadangan (.json)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold space-y-1">
            <p>💡 <strong>Tips:</strong> Ekspor data setoran dari HP Anda terlebih dahulu, lalu impor di laptop Anda. Seluruh data (setoran, stok, kas, dan setelan) akan sinkron instan tanpa perlu input ulang!</p>
          </div>
        </div>
        
        {/* Help Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="text-amber-500 w-5 h-5" />
            <span>Panduan Sinkronisasi Live</span>
          </h4>

          <div className="space-y-3 font-medium text-xs text-slate-600 leading-relaxed">
            <p>
              Untuk mengaktifkan sinkronisasi <strong>Live Google Sheet</strong>:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-500">
              <li>Pastikan link Google Spreadsheet disetel ke <strong>"Siapa saja yang memiliki link dapat melihat"</strong> di menu Berbagi Google.</li>
              <li>Pastikan penamaan kolom di spreadsheet Anda merepresentasikan parameter: <strong>Tanggal, Sales, Toko, Alamat/Wilayah, Penjualan, Status Kunjungan</strong>.</li>
              <li>Aplikasi memiliki algoritma fuzzy-matching cerdas yang secara otomatis mendeteksi kolom walaupun penamaannya bervariasi (contoh: "Qty", "Jumlah", atau "Penjualan" akan otomatis terbaca sebagai volume order).</li>
            </ol>
          </div>
        </div>

        {/* Business Vibe Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
          <Cigarette className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-amber-400">Komitmen Kualitas Makayasa</h4>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Pusat kendali (Komandan Command Center) membantu menjaga reliabilitas pengiriman, kedisiplinan sales di lapangan, serta memastikan ketersediaan pasokan rokok Makayasa di setiap wilayah potensial.
          </p>
        </div>

      </div>

    </div>
  );
}
