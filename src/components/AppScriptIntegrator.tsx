/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Code2, 
  Copy, 
  CheckCircle, 
  HelpCircle, 
  Settings, 
  Globe, 
  CloudLightning,
  AlertTriangle,
  Play,
  Bell,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Check,
  ShieldAlert
} from 'lucide-react';

interface AppScriptIntegratorProps {
  appScriptUrl: string;
  setAppScriptUrl: (url: string) => void;
  onTestSync: (url: string) => void;
  testStatus: 'idle' | 'testing' | 'success' | 'error';
  testMessage: string;
  onSimulateIncomingTransaction: (customTx?: any) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  autoSimulate: boolean;
  setAutoSimulate: (enabled: boolean) => void;
  notificationPermission: 'default' | 'granted' | 'denied';
  onRequestPermission: () => void;
}

export default function AppScriptIntegrator({
  appScriptUrl,
  setAppScriptUrl,
  onTestSync,
  testStatus,
  testMessage,
  onSimulateIncomingTransaction,
  soundEnabled,
  setSoundEnabled,
  autoSimulate,
  setAutoSimulate,
  notificationPermission,
  onRequestPermission
}: AppScriptIntegratorProps) {
  const [copied, setCopied] = useState(false);

  // High-performance Apps Script code to expose spreadsheet as JSON API
  const appScriptCode = `/**
 * Google Apps Script - Realtime Read/Write API untuk Makayasa Owner Dashboard
 * Tempatkan kode ini di: Ekstensi > Apps Script dalam Spreadsheet Anda.
 */

function doGet(e) {
  try {
    const action = e.parameter.action || "read_all";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Auto-create sheets if they don't exist
    getOrCreateSheet(ss, "Setoran Sales", ["ID", "Tanggal Setor", "Nama Sales", "Mulai Periode", "Selesai Periode", "Qty Packs", "Total Omset", "Jumlah Disetor", "Selisih Setoran", "Status Setoran", "Keterangan", "Archived"]);
    getOrCreateSheet(ss, "Stok Gudang", ["ID", "Tanggal", "Tipe", "Sumber/Tujuan", "Jumlah (Pack)", "Keterangan", "Sumber Input", "Hanya Sales", "Nama Sales", "Is Reversed", "Reversed At"]);
    getOrCreateSheet(ss, "Stok Sales", ["ID", "Tanggal", "Nama Sales", "Tipe", "Jumlah (Pack)", "Keterangan", "Sumber Input"]);
    getOrCreateSheet(ss, "Manajemen Freelance", ["ID", "Tanggal Ambil", "Nama Freelance", "Qty Packs", "Harga Per Pack", "Total Omset", "Status Pembayaran", "Jumlah Dibayar", "Kurang Bayar", "Keterangan"]);
    getOrCreateSheet(ss, "Keuangan", ["Nomor", "Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"]);
    
    if (action === "read_all") {
      const result = {};
      
      // Load standard visit logs (Data Sales / data sales / Transaksi / Sheet1)
      let mainSheet = ss.getSheetByName("Data Sales") || 
                      ss.getSheetByName("data sales") || 
                      ss.getSheetByName("Transaksi") || 
                      ss.getSheetByName("Sheet1");
      if (!mainSheet) {
        const auxiliarySheets = ["Setoran Sales", "Stok Gudang", "Stok Sales", "Manajemen Freelance", "Keuangan"];
        const sheets = ss.getSheets();
        for (let i = 0; i < sheets.length; i++) {
          const name = sheets[i].getName();
          if (auxiliarySheets.indexOf(name) === -1) {
            mainSheet = sheets[i];
            break;
          }
        }
      }
      if (!mainSheet) {
        mainSheet = ss.getSheets()[0];
      }
      result["Transaksi"] = getSheetData(mainSheet, "Transaksi");
      
      // Load other tabs
      const otherTabs = ["Setoran Sales", "Stok Gudang", "Stok Sales", "Manajemen Freelance", "Keuangan"];
      otherTabs.forEach(tabName => {
        const sheet = ss.getSheetByName(tabName);
        if (sheet) {
          result[tabName] = getSheetData(sheet, tabName);
        }
      });
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        timestamp: new Date().toISOString(),
        data: result 
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      const tabName = e.parameter.tab;
      if (!tabName) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Tab parameter is missing" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      const sheet = ss.getSheetByName(tabName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Tab not found: " + tabName }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: getSheetData(sheet, tabName) }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const tabName = postData.tab;
    const data = postData.data; // Array of objects
    
    if (action === "sync_tab" && tabName && Array.isArray(data)) {
      const headers = getTabHeaders(tabName);
      const sheet = getOrCreateSheet(ss, tabName, headers);
      
      // Force rewrite header row to ensure it matches the current format and fixes layout misalignment
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f1f5f9");
      sheet.setFrozenRows(1);
      
      // Clear existing values (keep header row 1)
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }
      
      if (data.length > 0) {
        // Map objects to rows based on header mapping
        const rows = data.map(obj => {
          return headers.map(header => {
            const valKey = mapHeaderToKey(header, tabName);
            let val = obj[valKey];
            if (val === undefined || val === null) {
              return "";
            }
            // Check for date and format as standard JS Date
            if (typeof val === "string" && (val.includes("T") || !isNaN(Date.parse(val))) && val.length > 10) {
              const parsedDate = new Date(val);
              if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
              }
            }
            return val;
          });
        });
        
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "Tab " + tabName + " synced successfully with " + data.length + " rows" 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid action or tab parameters" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSheetData(sheet, tabName) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0].map(h => h.toString().trim());
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    let hasData = false;
    headers.forEach((header, index) => {
      let cellValue = row[index];
      if (cellValue !== "" && cellValue !== null && cellValue !== undefined) {
        hasData = true;
      }
      if (cellValue instanceof Date) {
        cellValue = cellValue.toISOString();
      }
      const key = mapHeaderToKey(header, tabName);
      obj[key] = cellValue;
    });
    if (hasData) {
      data.push(obj);
    }
  }
  return data;
}

function getTabHeaders(tabName) {
  if (tabName === "Setoran Sales") {
    return ["ID", "Tanggal Setor", "Nama Sales", "Mulai Periode", "Selesai Periode", "Qty Packs", "Total Omset", "Jumlah Disetor", "Selisih Setoran", "Status Setoran", "Keterangan", "Archived"];
  } else if (tabName === "Stok Gudang") {
    return ["ID", "Tanggal", "Tipe", "Sumber/Tujuan", "Jumlah (Pack)", "Keterangan", "Sumber Input", "Hanya Sales", "Nama Sales", "Is Reversed", "Reversed At"];
  } else if (tabName === "Stok Sales") {
    return ["ID", "Tanggal", "Nama Sales", "Tipe", "Jumlah (Pack)", "Keterangan", "Sumber Input"];
  } else if (tabName === "Manajemen Freelance") {
    return ["ID", "Tanggal Ambil", "Nama Freelance", "Qty Packs", "Harga Per Pack", "Total Omset", "Status Pembayaran", "Jumlah Dibayar", "Kurang Bayar", "Keterangan"];
  } else if (tabName === "Keuangan") {
    return ["Nomor", "Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", "Saldo"];
  }
  return [];
}

function mapHeaderToKey(header, tabName) {
  if (tabName === "Setoran Sales") {
    if (header === "Qty Packs") return "qtyPacksInPeriod";
    if (header === "Total Omset") return "totalOmsetInPeriod";
  } else if (tabName === "Manajemen Freelance") {
    if (header === "Qty Packs") return "qtyPacks";
    if (header === "Total Omset") return "totalOmset";
  } else if (tabName === "Stok Gudang") {
    if (header === "Jumlah (Pack)") return "jumlah";
  } else if (tabName === "Stok Sales") {
    if (header === "Jumlah (Pack)") return "jumlah";
  }

  const mapping = {
    "ID": "id",
    "Tanggal Setor": "tanggalSetor",
    "Nama Sales": "salesName",
    "Mulai Periode": "tanggalMulaiPeriode",
    "Selesai Periode": "tanggalSelesaiPeriode",
    "Qty Packs": "qtyPacks",
    "Total Omset": "totalOmset",
    "Jumlah Disetor": "jumlahDisetor",
    "Selisih Setoran": "selisihSetoran",
    "Status Setoran": "statusSetoran",
    "Keterangan": "keterangan",
    "Archived": "archived",
    
    "Tanggal": "tanggal",
    "Tipe": "tipe",
    "Sumber/Tujuan": "sumberTujuan",
    "Jumlah (Pack)": "jumlah",
    "Sumber Input": "sumberInput",
    "Hanya Sales": "hanyaSales",
    "Is Reversed": "isReversed",
    "Reversed At": "reversedAt",
    
    "Tanggal Ambil": "tanggalAmbil",
    "Nama Freelance": "namaFreelance",
    "Harga Per Pack": "pricePerPack",
    "Status Pembayaran": "statusPembayaran",
    "Jumlah Dibayar": "jumlahDibayar",
    "Kurang Bayar": "kurangBayar",
    
    "Kategori": "kategori",
    "Nominal": "nominal",
    "Nomor": "nomor",
    "Pemasukan": "pemasukan",
    "Pengeluaran": "pengeluaran",
    "Saldo": "saldo"
  };
  return mapping[header] || header.toLowerCase().replace(/[^a-z0-9]/g, "");
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Real-time URL and ID length validation check
  const getUrlWarning = () => {
    if (!appScriptUrl) return null;
    const urlClean = appScriptUrl.trim();
    if (urlClean.includes("script.google.com/macros/s/")) {
      const parts = urlClean.split("script.google.com/macros/s/");
      if (parts.length === 2) {
        const idSegment = parts[1].split("?")[0].split("/")[0].trim();
        if (idSegment.length > 0 && idSegment.length < 50) {
          return `ID Web App tampaknya terpotong (${idSegment.length} karakter). ID Web App yang valid biasanya 70-80 karakter (diawali 'AKfycb...'). Coba salin ulang secara utuh.`;
        }
      }
    } else if (urlClean.length > 0 && !urlClean.startsWith("https://script.google.com")) {
      return "URL tidak valid. Harus berupa URL Google Apps Script Web App yang diawali dengan 'https://script.google.com/macros/s/'";
    }
    return null;
  };
  const urlWarning = getUrlWarning();

  return (
    <div id="appscript_view" className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      
      {/* Code panel (3/5 width) */}
      <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-amber-500" />
              <span>Kode Google Apps Script (CORS Friendly)</span>
            </h4>
            <button
              onClick={handleCopy}
              id="btn_copy_code"
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors border border-slate-100"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Script</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Salin skrip di bawah dan tempelkan ke menu editor Google Apps Script di Spreadsheet Anda untuk mengaktifkan sinkronisasi real-time.
          </p>
        </div>

        {/* Code display screen */}
        <div className="mt-4 bg-slate-900 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto border border-slate-800 max-h-96 custom-scrollbar">
          <pre>{appScriptCode}</pre>
        </div>

        <div className="mt-4 p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-2.5 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-800 leading-normal font-medium">
            <strong>Catatan Penting Deployment:</strong> Saat mendeploy Apps Script sebagai <em>Web App</em> di Google console, pastikan untuk mengatur akses <strong>"Execute as: Me"</strong> dan <strong>"Who has access: Anyone"</strong> agar aplikasi dashboard ini dapat membaca data tanpa halangan login.
          </p>
        </div>
      </div>

      {/* Deploy Steps Guide and Test URL Panel (2/5 width) */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Step-by-Step Guide card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            <span>Langkah Pemasangan (5 Menit)</span>
          </h4>

          <div className="space-y-4 font-medium text-xs text-slate-600">
            {/* Step 1 */}
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-slate-900 font-bold">Buka Spreadsheet Anda</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Buka file Google Sheet yang ingin digunakan untuk mencatat data sales.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-slate-900 font-bold">Buka Apps Script Editor</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Klik menu <strong>Ekstensi</strong> di atas, lalu pilih <strong>Apps Script</strong>.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-slate-900 font-bold">Paste Kode & Simpan</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Hapus kode bawaan, lalu paste Kode Script yang telah disalin di panel kiri. Klik ikon Simpan (Disk).</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">4</span>
              <div>
                <p className="text-slate-900 font-bold">Deploy Sebagai Web App</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Klik tombol <strong>Terapkan (Deploy)</strong> &gt; <strong>Penerapan baru (New deployment)</strong>. Pilih tipe: <em>Web App</em>.</p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">5</span>
              <div>
                <p className="text-slate-900 font-bold">Salin URL & Masukkan ke Sini</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Salin URL Web App yang dihasilkan oleh Google, lalu masukkan URL tersebut ke form pengujian di bawah.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live AppScript URL tester */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CloudLightning className="w-5 h-5 text-emerald-500 animate-pulse" />
            <span>Sambungkan & Tes Web App API</span>
          </h4>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 block">URL Google Apps Script Web App:</label>
            <input
              id="appscript_url_input"
              type="url"
              value={appScriptUrl}
              onChange={(e) => setAppScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700"
            />
            {urlWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[10.5px] leading-normal font-medium flex gap-2 items-start animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{urlWarning}</span>
              </div>
            )}
          </div>

          {/* Test Status feedback */}
          {testStatus !== 'idle' && (
            <div className={`p-3 rounded-xl text-xs flex gap-2 items-start ${
              testStatus === 'testing' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
              testStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
              'bg-red-50 text-red-700 border border-red-100'
            }`}>
              <div className="shrink-0 mt-0.5">
                {testStatus === 'testing' ? (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
              </div>
              <p className="font-medium">{testMessage}</p>
            </div>
          )}

          <button
            onClick={() => onTestSync(appScriptUrl)}
            disabled={!appScriptUrl || testStatus === 'testing'}
            id="btn_test_sync"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Tes Sinkronisasi & Simpan</span>
          </button>
        </div>

        {/* Real-time Notification Simulator card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              <span>Simulasi Notifikasi Transaksi</span>
            </h4>
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${autoSimulate ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${autoSimulate ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Pemberitahuan real-time mensimulasikan sistem peringatan ketika data transaksi baru dimasukkan ke spreadsheet/Apps Script dari perangkat sales di lapangan.
          </p>

          <div className="space-y-3.5 pt-1">
            {/* 1. Browser Push Notification Izin */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-800 block">Notifikasi Browser Native</span>
                <span className="text-[10px] text-slate-400 block font-medium">
                  {notificationPermission === 'granted' ? 'Status: Diizinkan' : 
                   notificationPermission === 'denied' ? 'Status: Diblokir' : 'Status: Belum Diatur'}
                </span>
              </div>
              
              {notificationPermission === 'granted' ? (
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg animate-fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Aktif</span>
                </div>
              ) : notificationPermission === 'denied' ? (
                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Diblokir</span>
                </div>
              ) : (
                <button
                  onClick={onRequestPermission}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg transition-colors shadow-sm"
                >
                  Minta Izin
                </button>
              )}
            </div>

            {/* 2. Notification Sound Toggle & Auto Simulation Toggle */}
            <div className="grid grid-cols-2 gap-3">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                  soundEnabled 
                    ? 'bg-amber-50/50 border-amber-200/60 text-amber-900' 
                    : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  <span className={`text-[10px] font-black uppercase tracking-wider ${soundEnabled ? 'text-amber-500' : 'text-slate-400'}`}>
                    {soundEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <span className="text-[10px] font-bold mt-1">Efek Suara Chime</span>
              </button>

              {/* Auto Simulate Toggle */}
              <button
                onClick={() => setAutoSimulate(!autoSimulate)}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                  autoSimulate 
                    ? 'bg-emerald-50/50 border-emerald-200/60 text-emerald-900' 
                    : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Radio className={`w-4 h-4 ${autoSimulate ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-wider ${autoSimulate ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {autoSimulate ? 'AUTO' : 'OFF'}
                  </span>
                </div>
                <span className="text-[10px] font-bold mt-1">Polling Otomatis (18s)</span>
              </button>
            </div>

            {/* 3. Action Buttons & Custom Trigger Form */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peluncur Transaksi</span>
              
              {/* Custom simulated fields */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Nama Sales</label>
                    <select
                      id="sim_sales_select"
                      className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      defaultValue=""
                    >
                      <option value="">Acak (Random)</option>
                      <option value="Rico">Rico (Semarang)</option>
                      <option value="Anwari">Anwari (Kudus)</option>
                      <option value="Subai">Subai (Demak)</option>
                      <option value="Hafan">Hafan (Pati)</option>
                      <option value="Jefri">Jefri (Jepara)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Volume (Pak)</label>
                    <input
                      id="sim_qty_input"
                      type="number"
                      min="5"
                      max="100"
                      placeholder="Acak (Random)"
                      className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    const salesSelect = document.getElementById('sim_sales_select') as HTMLSelectElement;
                    const qtyInput = document.getElementById('sim_qty_input') as HTMLInputElement;
                    const customTx: any = {};
                    if (salesSelect && salesSelect.value) {
                      customTx.salesName = salesSelect.value;
                    }
                    if (qtyInput && qtyInput.value) {
                      customTx.qtyPacks = parseInt(qtyInput.value, 10);
                    }
                    onSimulateIncomingTransaction(customTx);
                  }}
                  id="btn_launch_simulation"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 shadow transition-all active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kirim Transaksi Terkustomisasi</span>
                </button>
              </div>

              {/* Direct random launcher button */}
              <button
                onClick={() => onSimulateIncomingTransaction()}
                id="btn_simulate_random"
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-900 border border-amber-200/50 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Play className="w-3 h-3 text-amber-600" />
                <span>Simulasikan Transaksi Acak Sekarang</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
