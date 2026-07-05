/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  History, 
  Search, 
  Filter, 
  Store, 
  MapPin, 
  CheckCircle2, 
  XCircle,
  PlusCircle,
  RefreshCcw,
  BadgeDollarSign
} from 'lucide-react';
import { Transaction } from '../types';
import { formatIDR, formatDateIndo } from '../utils/spreadsheetParser';

interface LogTransaksiProps {
  transactions: Transaction[];
}

export default function LogTransaksi({ transactions }: LogTransaksiProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Baru Order' | 'Order' | 'Tidak Order' | 'Repeat Order'>('all');

  // Filter logs by search query and status category
  const filteredLogs = transactions.filter(tx => {
    const matchesSearch = 
      tx.salesName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.storeAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.id.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'Baru Order' || statusFilter === 'Order') {
      matchesStatus = tx.statusKunjungan === 'Baru Order' || (tx.statusKunjungan as string) === 'Order';
    } else {
      matchesStatus = tx.statusKunjungan === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Render status badges dynamically with corresponding aesthetics
  const renderStatusBadge = (status: 'Baru Order' | 'Order' | 'Tidak Order' | 'Repeat Order') => {
    switch (status) {
      case 'Repeat Order':
        return (
          <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 px-2 py-1 rounded text-[10px] font-black uppercase border border-sky-100">
            <RefreshCcw className="w-3 h-3 text-sky-500" />
            <span>Repeat Order</span>
          </span>
        );
      case 'Baru Order':
      case 'Order':
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-black uppercase border border-indigo-100">
            <CheckCircle2 className="w-3 h-3 text-indigo-500" />
            <span>Baru Order</span>
          </span>
        );
      case 'Tidak Order':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-[10px] font-black uppercase border border-amber-100">
            <XCircle className="w-3 h-3 text-amber-500" />
            <span>Tidak Order</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="log_transaksi_view" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
      {/* Search and control filter line */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Arsip & Log Transaksi Real-time</h4>
          <p className="text-xs text-slate-500">Melihat daftar utuh kronologis aktivitas kunjungan dan rincian transaksi logistik</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              id="log_search_input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID, Toko, Sales..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold text-slate-700"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="log_status_select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="Baru Order">Status: Baru Order</option>
              <option value="Repeat Order">Status: Repeat Order</option>
              <option value="Tidak Order">Status: Tidak Order</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table logs */}
      <div className="overflow-x-auto rounded-xl border border-slate-100 w-full">
        <table className="w-full min-w-[800px] text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
            <tr>
              <th className="p-4">ID Transaksi</th>
              <th className="p-4">Tanggal & Jam</th>
              <th className="p-4">Salesperson</th>
              <th className="p-4">Nama Toko</th>
              <th className="p-4">Status Kunjungan</th>
              <th className="p-4 text-center">Volume (Pak)</th>
              <th className="p-4 text-right">Omset (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((tx, idx) => (
                <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-400">
                    {tx.id}
                  </td>
                  <td className="p-4 font-mono text-[11px] text-slate-500">
                    {tx.tanggal.toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="p-4 font-bold text-slate-900">
                    {tx.salesName}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        {tx.storeName}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">{tx.storeAddress}</span>
                      <div className="mt-1">
                        {tx.statusToko === 'Konsumen / End User' ? (
                          <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.2 rounded text-[8px] border border-indigo-100/50 shadow-sm">
                            👤 Konsumen / End User
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-800 font-extrabold px-1.5 py-0.2 rounded text-[8px] border border-amber-100/50 shadow-sm">
                            🏪 Toko / Outlet
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {renderStatusBadge(tx.statusKunjungan)}
                  </td>
                  <td className="p-4 text-center font-bold font-mono text-indigo-600">
                    {tx.qtyPacks}
                  </td>
                  <td className="p-4 text-right font-bold font-mono text-emerald-600">
                    {tx.omset > 0 ? formatIDR(tx.omset) : '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Data log transaksi tidak ditemukan. Coba hapus kata kunci pencarian atau ubah filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
