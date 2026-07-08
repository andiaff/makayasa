/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Eye, EyeOff, ShieldAlert, TrendingUp } from 'lucide-react';
import { AppConfig } from '../types';

interface LoginProps {
  onLoginSuccess: (username: string, salesName?: string) => void;
  config?: AppConfig;
}

export default function Login({ onLoginSuccess, config }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const expectedUser = (config?.loginUsername || 'komandan').toLowerCase();
    const expectedPass = config?.loginPassword || 'makayasajaya';
    const successName = config?.ownerName || 'Komandan Makayasa';

    const normalizedUsername = username.trim().toLowerCase();
    const matchingSales = config?.salesAccounts?.find(
      sa => sa.username.trim().toLowerCase() === normalizedUsername && sa.password === password
    );

    // Authentication check against configured credentials
    setTimeout(() => {
      if (normalizedUsername === expectedUser && password === expectedPass) {
        onLoginSuccess(successName);
      } else if (matchingSales) {
        onLoginSuccess(`Sales ${matchingSales.salesName}`, matchingSales.salesName);
      } else {
        setError('Username atau Password salah. Silakan periksa kembali.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div id="login_container" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background soft geometric blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/2 translate-y-1/2" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 text-amber-400 mb-4 shadow-lg shadow-slate-900/10">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-sans text-slate-900 tracking-tight uppercase">{config?.brandName || 'MAKAYASA JEMBER'}</h2>
          <p className="text-xs text-slate-500 mt-2">Masuk untuk memantau kinerja sales & omset real-time</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-600"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                id="login_username_input"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                placeholder="Masukkan username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Kata Sandi</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="login_password_input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                placeholder="Masukkan kata sandi"
              />
              <button
                type="button"
                id="login_toggle_password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login_submit_btn"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-semibold rounded-xl text-sm transition-all shadow-md active:scale-98 disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Memverifikasi...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Brand Motto */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-4">
          <p className="text-base font-extrabold text-amber-600 tracking-widest uppercase font-sans drop-shadow-sm">
            "Dari Desa untuk Dunia"
          </p>
          
          {/* Motivational Quote Card - Option A (Simple, Powerful, Eye-catching) */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-all">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100/30 rounded-full blur-xl -mr-4 -mt-4 transition-all" />
            <p className="text-sm text-slate-850 font-extrabold tracking-wide font-sans">
              KERJA KERAS • SABAR • SUKSES
            </p>
            <p className="text-[10px] text-slate-500 mt-1.5 font-medium italic">
              "Kerja keras tidak akan mengkhianati hasil, semua atas izin Allah SWT."
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
