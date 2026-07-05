/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  User, 
  Plus, 
  X, 
  Search, 
  Trash2, 
  Archive, 
  RotateCcw, 
  Printer, 
  Info, 
  Coins,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Download
} from 'lucide-react';
import { Transaction, SalesDeposit } from '../types';
import { formatIDR, formatDateIndo } from '../utils/spreadsheetParser';

interface SetoranSalesProps {
  transactions: Transaction[];
  salesNames: string[];
  loggedInSalesName?: string | null;
}

export default function SetoranSales({ transactions, salesNames, loggedInSalesName }: SetoranSalesProps) {
  // --- STATE ---
  const [deposits, setDeposits] = useState<SalesDeposit[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState<boolean>(false);
  const [selectedDeposit, setSelectedDeposit] = useState<SalesDeposit | null>(null);

  // Settlement modal state
  const [showSettleModal, setShowSettleModal] = useState<boolean>(false);
  const [settlingDeposit, setSettlingDeposit] = useState<SalesDeposit | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleKeterangan, setSettleKeterangan] = useState<string>('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Lunas' | 'Kurang' | 'Lebih'>('All');
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');

  // Form State
  const [formSales, setFormSales] = useState<string>('');
  const [formTanggalSetor, setFormTanggalSetor] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formTanggalMulai, setFormTanggalMulai] = useState<string>('');
  const [formTanggalSelesai, setFormTanggalSelesai] = useState<string>('');
  const [formJumlahDisetor, setFormJumlahDisetor] = useState<number | string>('');
  const [formKeterangan, setFormKeterangan] = useState<string>('');

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- INITIAL DATA LOAD & PERSISTENCE ---
  useEffect(() => {
    // One-time automatic reset is disabled to prevent data wiping on new devices
    localStorage.setItem('makayasa_sales_deposits_reset_v2', 'true');

    const saved = localStorage.getItem('makayasa_sales_deposits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Map date strings back to Date objects
        const formatted = parsed.map((item: any) => ({
          ...item,
          tanggalSetor: new Date(item.tanggalSetor),
          tanggalMulaiPeriode: new Date(item.tanggalMulaiPeriode),
          tanggalSelesaiPeriode: new Date(item.tanggalSelesaiPeriode),
        }));
        setDeposits(formatted);
      } catch (e) {
        console.error('Error parsing sales deposits from localStorage', e);
      }
    } else {
      // Empty by default as requested by the user
      setDeposits([]);
      localStorage.setItem('makayasa_sales_deposits', JSON.stringify([]));
    }
  }, []);

  // Sync update listener
  useEffect(() => {
    const handleSyncUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.key === 'makayasa_sales_deposits') {
        const saved = localStorage.getItem('makayasa_sales_deposits');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const formatted = parsed.map((item: any) => ({
              ...item,
              tanggalSetor: new Date(item.tanggalSetor),
              tanggalMulaiPeriode: new Date(item.tanggalMulaiPeriode),
              tanggalSelesaiPeriode: new Date(item.tanggalSelesaiPeriode),
            }));
            setDeposits(formatted);
          } catch (e) {
            console.error('Error parsing sales deposits during sync', e);
          }
        } else {
          setDeposits([]);
        }
      }
    };
    window.addEventListener('makayasa_sync_update', handleSyncUpdate);
    return () => {
      window.removeEventListener('makayasa_sync_update', handleSyncUpdate);
    };
  }, []);

  const handleResetBukuBesar = () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan seluruh catatan Buku Besar Setoran Sales? Semua riwayat setoran di sistem akan dihapus permanen.')) {
      saveDeposits([]);
      triggerNotification('Buku besar setoran sales berhasil direset & dikosongkan!', 'success');
    }
  };

  const saveDeposits = (newDeposits: SalesDeposit[]) => {
    setDeposits(newDeposits);
    localStorage.setItem('makayasa_sales_deposits', JSON.stringify(newDeposits));
  };

  const triggerNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDownloadReceiptPDF = (dep: SalesDeposit) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      // Colors
      const primaryColor = [15, 23, 42]; // #0f172a (dark slate)
      const secondaryColor = [245, 158, 11]; // #f59e0b (amber)
      const textColor = [51, 65, 85]; // #334155 (slate-700)
      const mutedColor = [100, 116, 139]; // #64748b (slate-500)
      const lightBg = [248, 250, 252]; // #f8fafc (slate-50)

      // Background Page Border
      doc.setDrawColor(226, 232, 240); // #e2e8f0
      doc.setLineWidth(1);
      doc.rect(5, 5, 138, 200);

      // Header Block
      doc.setFillColor(15, 23, 42);
      doc.rect(8, 8, 132, 34, 'F');

      // Helper to draw filled diamond in PDF
      const drawPdfFilledDiamond = (cx: number, cy: number, halfSize: number, r: number, g: number, b: number) => {
        doc.setFillColor(r, g, b);
        doc.triangle(cx, cy - halfSize, cx - halfSize, cy, cx + halfSize, cy, 'F');
        doc.triangle(cx, cy + halfSize, cx - halfSize, cy, cx + halfSize, cy, 'F');
      };

      // Draw official Makayasa Logo in PDF
      
      // 1. Hollow diamond below (Golden/Amber)
      doc.setLineWidth(0.81);
      doc.setDrawColor(245, 158, 11);
      doc.line(68.42, 19.18, 70.58, 21.34);
      doc.line(70.58, 21.34, 68.42, 23.5);
      doc.line(68.42, 23.5, 66.26, 21.34);
      doc.line(66.26, 21.34, 68.42, 19.18);

      // 2. Solid diamond Mask (Dark Slate background color)
      doc.setFillColor(15, 23, 42);
      doc.triangle(68.42, 15.31, 71.03, 17.92, 65.81, 17.92, 'F');
      doc.triangle(68.42, 20.53, 71.03, 17.92, 65.81, 17.92, 'F');

      // 3. Solid diamond (Golden/Amber)
      doc.setFillColor(245, 158, 11);
      doc.triangle(68.42, 15.58, 70.76, 17.92, 66.08, 17.92, 'F');
      doc.triangle(68.42, 20.26, 70.76, 17.92, 66.08, 17.92, 'F');

      // 4. Stylized M (Golden/Amber)
      doc.setFillColor(245, 158, 11);
      // Left diagonal
      doc.triangle(68.42, 10, 68.42, 13.24, 75.17, 19.9, 'F');
      doc.triangle(68.42, 10, 75.17, 19.9, 75.17, 16.66, 'F');
      // Right diagonal
      doc.triangle(75.17, 16.66, 75.17, 19.9, 79.67, 13.24, 'F');
      doc.triangle(75.17, 16.66, 79.67, 13.24, 79.67, 10, 'F');
      // Right stem (rect)
      doc.rect(79.67, 10, 2.25, 13.5, 'F');

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MAKAYASA', 74, 26, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(245, 158, 11);
      doc.text('PR. MAHAPUTERA NUSANTARA', 74, 30, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('BUKTI TANDA TERIMA SETORAN KASIR', 74, 37, { align: 'center' });

      // Info Details
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      let y = 48;
      const drawPdfRow = (label: string, value: string, isBoldVal = false) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(label, 12, y);

        doc.setFont('helvetica', isBoldVal ? 'bold' : 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(value, 136, y, { align: 'right' });
        y += 7;
      };

      drawPdfRow('No. Referensi:', dep.id, true);
      drawPdfRow('Tanggal Setor:', formatDateIndo(dep.tanggalSetor));
      drawPdfRow('Penerima:', 'Komandan Makayasa (Kasir)');
      drawPdfRow('Nama Salesman:', dep.salesName, true);

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(10, y, 138, y);
      y += 6;

      // Section 1: Periode Penjualan Active
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('PERIODE PENJUALAN ACTIVE', 12, y);
      y += 6;

      drawPdfRow('Mulai Hari:', formatDateIndo(dep.tanggalMulaiPeriode));
      drawPdfRow('Sampai Hari:', formatDateIndo(dep.tanggalSelesaiPeriode));
      drawPdfRow('Volume Terjual:', `${dep.qtyPacksInPeriod} Packs`, true);

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(10, y, 138, y);
      y += 6;

      // Section: Detail Produk
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('DETAIL PRODUK', 12, y);
      y += 6;

      // Table Header for Products
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Nama Produk', 12, y);
      doc.text('Qty', 75, y, { align: 'right' });
      doc.text('Nominal', 136, y, { align: 'right' });
      y += 4;

      doc.setDrawColor(241, 245, 249);
      doc.line(10, y, 138, y);
      y += 5;

      // Table Row for "Makayasa Kretek 12"
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Makayasa Kretek 12', 12, y);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${dep.qtyPacksInPeriod} Packs`, 75, y, { align: 'right' });
      doc.text(formatIDR(dep.totalOmsetInPeriod), 136, y, { align: 'right' });
      y += 7;

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(10, y, 138, y);
      y += 6;

      // Section 2: Financial
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('PERHITUNGAN FINANSIAL', 12, y);
      y += 6;

      drawPdfRow('Target Tagihan Omset:', formatIDR(dep.totalOmsetInPeriod));

      // Highlight Jumlah Fisik Disetor
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(5, 150, 105); // Emerald Green
      doc.text('Jumlah Fisik Disetor:', 12, y);
      doc.text(formatIDR(dep.jumlahDisetor), 136, y, { align: 'right' });
      y += 8;

      drawPdfRow('Status Pembayaran:', dep.statusSetoran, true);

      if (dep.statusSetoran !== 'Lunas') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        if (dep.statusSetoran === 'Kurang Setor') {
          doc.setTextColor(220, 38, 38); // Red
        } else {
          doc.setTextColor(79, 70, 229); // Indigo/Purple
        }
        doc.text('Nominal Selisih:', 12, y);
        doc.text(formatIDR(dep.selisihSetoran), 136, y, { align: 'right' });
        y += 8;
      }

      // Keterangan / Notes
      if (dep.keterangan) {
        y += 2;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(10, y, 128, 14, 'FD');

        doc.setFont('helvetica', 'oblique');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        
        // Truncate/wrap notes just in case
        const notesWords = `Catatan: "${dep.keterangan}"`;
        if (notesWords.length > 70) {
          doc.text(notesWords.substring(0, 70), 12, y + 5);
          doc.text(notesWords.substring(70), 12, y + 10);
        } else {
          doc.text(notesWords, 12, y + 7);
        }
        y += 18;
      } else {
        y += 4;
      }

      // Signatures Block
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      // Left signature
      doc.text('Menyerahkan,', 35, y, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(dep.salesName, 35, y + 16, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Salesman', 35, y + 20, { align: 'center' });

      // Right signature
      doc.setTextColor(71, 85, 105);
      doc.text('Menerima,', 113, y, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Komandan (Kasir)', 113, y + 16, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Kasir Makayasa', 113, y + 20, { align: 'center' });

      // Footer
      y += 27;
      doc.setDrawColor(203, 213, 225);
      doc.line(10, y, 138, y);

      y += 5;
      doc.setFont('helvetica', 'oblique');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Terima kasih atas dedikasi dan kejujuran Anda dalam bekerja!', 74, y, { align: 'center' });

      // Save PDF
      doc.save(`nota_setoran_${dep.salesName.replace(/\s+/g, '_')}_${dep.id}.pdf`);
      triggerNotification('Nota berhasil diunduh sebagai file PDF profesional!', 'success');
    } catch (err: any) {
      console.error('Error rendering PDF:', err);
      triggerNotification('Gagal mengunduh file PDF. Silakan coba lagi.', 'error');
    }
  };

  const handleDownloadReceiptPNG = (dep: SalesDeposit) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 980;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Draw header block (taller 135px height)
    ctx.fillStyle = '#0f172a'; // dark slate
    ctx.fillRect(20, 20, canvas.width - 40, 135);

    // Draw official Makayasa Logo in Canvas (Perfect layout and alignment)
    // 1. Hollow diamond below
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(269, 77);
    ctx.lineTo(281, 89);
    ctx.lineTo(269, 101);
    ctx.lineTo(257, 89);
    ctx.closePath();
    ctx.stroke();

    // 2. Solid diamond Mask (Dark Slate background color)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(269, 55.5);
    ctx.lineTo(283.5, 70);
    ctx.lineTo(269, 84.5);
    ctx.lineTo(254.5, 70);
    ctx.closePath();
    ctx.fill();

    // 3. Solid diamond (Golden/Amber)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(269, 57);
    ctx.lineTo(282, 70);
    ctx.lineTo(269, 83);
    ctx.lineTo(256, 70);
    ctx.closePath();
    ctx.fill();

    // 4. Stylized heavy 'M'
    ctx.fillStyle = '#f59e0b';
    // Left diagonal
    ctx.beginPath();
    ctx.moveTo(269, 26);
    ctx.lineTo(269, 44);
    ctx.lineTo(306.5, 81);
    ctx.lineTo(306.5, 63);
    ctx.closePath();
    ctx.fill();

    // Right diagonal
    ctx.beginPath();
    ctx.moveTo(306.5, 63);
    ctx.lineTo(306.5, 81);
    ctx.lineTo(331.5, 44);
    ctx.lineTo(331.5, 26);
    ctx.closePath();
    ctx.fill();

    // Right stem
    ctx.fillRect(331.5, 26, 12.5, 75);

    // Header text (offset down by 30px to fit perfectly with the new logo and taller header block)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MAKAYASA', canvas.width / 2, 116);
    
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#f59e0b'; // amber
    ctx.fillText('PR. MAHAPUTERA NUSANTARA', canvas.width / 2, 130);

    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BUKTI TANDA TERIMA SETORAN KASIR', canvas.width / 2, 146);

    // Receipt details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 14px monospace';

    let y = 160;
    const drawRow = (label: string, value: string, isBoldValue = false) => {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px monospace';
      ctx.fillText(label, 40, y);
      
      ctx.fillStyle = isBoldValue ? '#0f172a' : '#334155';
      ctx.font = isBoldValue ? 'bold 14px monospace' : '14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(value, canvas.width - 40, y);
      ctx.textAlign = 'left';
      y += 30;
    };

    drawRow('No. Referensi:', dep.id, true);
    drawRow('Tanggal Setor:', formatDateIndo(dep.tanggalSetor));
    drawRow('Penerima:', 'Komandan Makayasa');
    drawRow('Nama Salesman:', dep.salesName, true);

    // Divider line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(canvas.width - 30, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += 25;

    // Section title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PERIODE PENJUALAN ACTIVE', 40, y);
    y += 25;

    drawRow('Mulai Hari:', formatDateIndo(dep.tanggalMulaiPeriode));
    drawRow('Sampai Hari:', formatDateIndo(dep.tanggalSelesaiPeriode));
    drawRow('Volume Terjual:', `${dep.qtyPacksInPeriod} Packs`, true);

    // Divider line
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(canvas.width - 30, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += 25;

    // Section Title: DETAIL PRODUK
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('DETAIL PRODUK', 40, y);
    y += 25;

    // Table Header
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Nama Produk', 40, y);
    
    ctx.textAlign = 'right';
    ctx.fillText('Qty', 360, y);
    ctx.fillText('Nominal', canvas.width - 40, y);
    ctx.textAlign = 'left';
    y += 12;

    // Table header line
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(canvas.width - 40, y);
    ctx.stroke();
    y += 20;

    // Table Row: Makayasa Kretek 12
    ctx.fillStyle = '#0f172a';
    ctx.font = '13px monospace';
    ctx.fillText('Makayasa Kretek 12', 40, y);

    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${dep.qtyPacksInPeriod} Packs`, 360, y);
    ctx.fillText(formatIDR(dep.totalOmsetInPeriod), canvas.width - 40, y);
    ctx.textAlign = 'left';
    y += 25;

    // Divider line after product detail
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(canvas.width - 30, y);
    ctx.stroke();
    ctx.setLineDash([]);
    y += 25;

    // Financial section
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PERHITUNGAN FINANSIAL', 40, y);
    y += 25;

    drawRow('Target Tagihan Omset:', formatIDR(dep.totalOmsetInPeriod));
    
    // Highlights
    ctx.fillStyle = '#059669'; // emerald
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Jumlah Fisik Disetor:', 40, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatIDR(dep.jumlahDisetor), canvas.width - 40, y);
    ctx.textAlign = 'left';
    y += 30;

    drawRow('Status Pembayaran:', dep.statusSetoran, true);

    if (dep.statusSetoran !== 'Lunas') {
      ctx.fillStyle = dep.statusSetoran === 'Kurang Setor' ? '#dc2626' : '#4f46e5';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('Nominal Selisih:', 40, y);
      ctx.textAlign = 'right';
      ctx.fillText(formatIDR(dep.selisihSetoran), canvas.width - 40, y);
      ctx.textAlign = 'left';
      y += 30;
    }

    // Notes
    if (dep.keterangan) {
      y += 10;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(40, y, canvas.width - 80, 55);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(40, y, canvas.width - 80, 55);

      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 11px sans-serif';
      // Multi-line wrap helper for notes
      const notesWords = `Catatan: "${dep.keterangan}"`;
      if (notesWords.length > 55) {
        ctx.fillText(notesWords.substring(0, 55), 50, y + 22);
        ctx.fillText(notesWords.substring(55), 50, y + 38);
      } else {
        ctx.fillText(notesWords, 50, y + 30);
      }
      y += 75;
    } else {
      y += 20;
    }

    // Signatures block
    y += 20;
    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    
    // Left Sig
    ctx.textAlign = 'center';
    ctx.fillText('Menyerahkan,', 120, y);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(dep.salesName, 120, y + 60);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Salesman', 120, y + 75);

    // Right Sig
    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText('Menerima,', canvas.width - 120, y);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('Komandan (Kasir)', canvas.width - 120, y + 60);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Kasir Makayasa', canvas.width - 120, y + 75);

    // Footer lines
    y += 110;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(canvas.width - 30, y);
    ctx.stroke();

    y += 20;
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Terima kasih atas dedikasi dan kejujuran Anda dalam bekerja!', canvas.width / 2, y);

    // Trigger download
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = dataUrl;
      downloadAnchor.download = `nota_setoran_${dep.salesName.replace(/\s+/g, '_')}_${dep.id}.png`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerNotification('Nota berhasil diunduh sebagai gambar PNG!', 'success');
    } catch (err: any) {
      console.error('Error rendering PNG on canvas:', err);
      triggerNotification('Gagal mengunduh nota. Silakan gunakan tombol Print.', 'error');
    }
  };

  // --- HELPER: CALCULATE SALES PERFORMANCE IN A PERIOD ---
  const periodSalesSummary = useMemo(() => {
    if (!formSales || !formTanggalMulai || !formTanggalSelesai) {
      return { qtyPacks: 0, totalOmset: 0, count: 0, rawQtyPacks: 0, rawCount: 0 };
    }

    const start = new Date(formTanggalMulai);
    start.setHours(0, 0, 0, 0);
    const end = new Date(formTanggalSelesai);
    end.setHours(23, 59, 59, 999);

    // Determine the latest covered sales date from their deposits
    const salesDeposits = deposits.filter(dep => dep.salesName === formSales);
    let maxCoveredDate: Date | null = null;
    salesDeposits.forEach(dep => {
      const d = new Date(dep.tanggalSelesaiPeriode);
      if (!maxCoveredDate || d > maxCoveredDate) {
        maxCoveredDate = d;
      }
    });

    let comparisonDate: Date | null = null;
    if (maxCoveredDate) {
      comparisonDate = new Date(maxCoveredDate);
      comparisonDate.setHours(23, 59, 59, 999);
    }

    const rawPeriodTxs = transactions.filter(tx => {
      if (tx.salesName !== formSales) return false;
      const txDate = new Date(tx.tanggal);
      return txDate >= start && txDate <= end;
    });

    const periodTxs = rawPeriodTxs.filter(tx => {
      const txDate = new Date(tx.tanggal);
      // Check if already covered by an existing deposit
      if (comparisonDate && txDate <= comparisonDate) {
        return false;
      }
      return true;
    });

    const qtyPacks = periodTxs.reduce((sum, tx) => sum + tx.qtyPacks, 0);
    const totalOmset = periodTxs.reduce((sum, tx) => sum + tx.omset, 0);
    const rawQtyPacks = rawPeriodTxs.reduce((sum, tx) => sum + tx.qtyPacks, 0);

    return {
      qtyPacks,
      totalOmset,
      count: periodTxs.length,
      rawQtyPacks,
      rawCount: rawPeriodTxs.length
    };
  }, [transactions, deposits, formSales, formTanggalMulai, formTanggalSelesai]);

  // Set suggested deposit amount when period sales changes
  useEffect(() => {
    if (periodSalesSummary.totalOmset > 0) {
      setFormJumlahDisetor(periodSalesSummary.totalOmset);
    } else {
      setFormJumlahDisetor('');
    }
  }, [periodSalesSummary.totalOmset]);

  // --- ADD DEPOSIT HANDLER ---
  const handleAddDeposit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSales) {
      triggerNotification('Silakan pilih nama sales!', 'error');
      return;
    }
    if (!formTanggalMulai || !formTanggalSelesai) {
      triggerNotification('Silakan pilih rentang tanggal penjualan!', 'error');
      return;
    }

    const start = new Date(formTanggalMulai);
    const end = new Date(formTanggalSelesai);
    if (start > end) {
      triggerNotification('Tanggal mulai tidak boleh melebihi tanggal selesai!', 'error');
      return;
    }

    const disetor = Number(formJumlahDisetor) || 0;
    const omsetTarget = periodSalesSummary.totalOmset;

    if (omsetTarget === 0) {
      triggerNotification('Tidak ada sisa omset penjualan yang perlu disetorkan untuk rentang tanggal ini!', 'error');
      return;
    }

    const selisih = omsetTarget - disetor;
    
    let status: 'Lunas' | 'Kurang Setor' | 'Lebih Setor' = 'Lunas';
    if (selisih > 0) status = 'Kurang Setor';
    else if (selisih < 0) status = 'Lebih Setor';

    const newDeposit: SalesDeposit = {
      id: `DEP-${Math.floor(10000 + Math.random() * 90000)}`,
      tanggalSetor: new Date(formTanggalSetor),
      salesName: formSales,
      tanggalMulaiPeriode: start,
      tanggalSelesaiPeriode: end,
      qtyPacksInPeriod: periodSalesSummary.qtyPacks,
      totalOmsetInPeriod: omsetTarget,
      jumlahDisetor: disetor,
      selisihSetoran: Math.abs(selisih),
      statusSetoran: status,
      keterangan: formKeterangan || 'Setoran tunai lapangan',
      archived: false,
    };

    saveDeposits([newDeposit, ...deposits]);
    setShowAddModal(false);
    
    // Reset form
    setFormSales('');
    setFormTanggalMulai('');
    setFormTanggalSelesai('');
    setFormJumlahDisetor('');
    setFormKeterangan('');
    
    triggerNotification(`Setoran untuk ${newDeposit.salesName} sebesar ${formatIDR(newDeposit.jumlahDisetor)} berhasil dicatat!`);
  };

  // --- DELETE DEPOSIT HANDLER ---
  const handleDeleteDeposit = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus record setoran ini secara permanen?')) {
      const updated = deposits.filter(dep => dep.id !== id);
      saveDeposits(updated);
      triggerNotification('Record setoran berhasil dihapus!', 'success');
    }
  };

  // --- ARCHIVING HANDLERS ---
  const handleArchiveDeposits = (type: 'all' | 'lunas') => {
    let count = 0;
    const updated = deposits.map(dep => {
      if (dep.archived) return dep;
      const shouldArchive = type === 'all' || (type === 'lunas' && dep.statusSetoran === 'Lunas');
      if (shouldArchive) {
        count++;
        return { ...dep, archived: true };
      }
      return dep;
    });

    if (count === 0) {
      triggerNotification(
        type === 'lunas' 
          ? 'Tidak ada setoran lunas aktif untuk diarsipkan!' 
          : 'Tidak ada setoran aktif untuk diarsipkan!', 
        'error'
      );
      return;
    }

    saveDeposits(updated);
    setShowArchiveConfirmModal(false);
    triggerNotification(`Berhasil mengarsipkan ${count} setoran ke riwayat historis!`);
  };

  const handleRestoreDeposit = (id: string) => {
    const updated = deposits.map(dep => {
      if (dep.id === id) {
        return { ...dep, archived: false };
      }
      return dep;
    });
    saveDeposits(updated);
    triggerNotification('Setoran berhasil dipulihkan ke daftar aktif!');
  };

  // --- HANDLER: SETTLE UNDERPAYMENT ---
  const handleSettleUnderpayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingDeposit) return;

    const amountToPay = Number(settleAmount);
    if (isNaN(amountToPay) || amountToPay <= 0) {
      triggerNotification('Masukkan nominal pembayaran yang valid!', 'error');
      return;
    }

    if (amountToPay > settlingDeposit.selisihSetoran) {
      if (!window.confirm(`Nominal pembayaran (${formatIDR(amountToPay)}) melebihi sisa kekurangan (${formatIDR(settlingDeposit.selisihSetoran)}). Apakah Anda ingin mencatat ini sebagai lebih setor?`)) {
        return;
      }
    }

    const updated = deposits.map(dep => {
      if (dep.id === settlingDeposit.id) {
        const newJumlahDisetor = dep.jumlahDisetor + amountToPay;
        const newSelisih = dep.totalOmsetInPeriod - newJumlahDisetor;
        
        let newStatus: 'Lunas' | 'Kurang Setor' | 'Lebih Setor' = 'Lunas';
        let finalSelisih = 0;
        
        if (newSelisih > 0) {
          newStatus = 'Kurang Setor';
          finalSelisih = newSelisih;
        } else if (newSelisih < 0) {
          newStatus = 'Lebih Setor';
          finalSelisih = Math.abs(newSelisih);
        }

        // Build log history in keterangan
        const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const paymentLog = `[Pelunasan ${dateStr}: +${formatIDR(amountToPay)}${settleKeterangan ? ` - ${settleKeterangan}` : ''}]`;
        const updatedKeterangan = dep.keterangan 
          ? `${dep.keterangan} | ${paymentLog}`
          : paymentLog;

        return {
          ...dep,
          jumlahDisetor: newJumlahDisetor,
          selisihSetoran: finalSelisih,
          statusSetoran: newStatus,
          keterangan: updatedKeterangan
        };
      }
      return dep;
    });

    saveDeposits(updated);
    setShowSettleModal(false);
    setSettlingDeposit(null);
    setSettleAmount('');
    setSettleKeterangan('');
    
    triggerNotification(`Pelunasan sebesar ${formatIDR(amountToPay)} untuk ${settlingDeposit.salesName} berhasil dicatat!`);
  };

  // --- RECONCILIATION ASSISTANT LOGIC ---
  const reconciliationData = useMemo(() => {
    // Generate an analysis of outstanding/un-deposited sales for each representative
    const namesToUse = loggedInSalesName
      ? salesNames.filter(name => name.toLowerCase().trim() === loggedInSalesName.toLowerCase().trim())
      : salesNames;
    return namesToUse.map(name => {
      // Find all deposits recorded for this sales
      const salesDeposits = deposits.filter(dep => dep.salesName === name);
      
      // Determine the latest covered sales date from their deposits
      let maxCoveredDate: Date | null = null;
      salesDeposits.forEach(dep => {
        const d = new Date(dep.tanggalSelesaiPeriode);
        if (!maxCoveredDate || d > maxCoveredDate) {
          maxCoveredDate = d;
        }
      });

      // Set comparison date to end of the max covered day (23:59:59.999) to include all transactions of that day
      let comparisonDate: Date | null = null;
      if (maxCoveredDate) {
        comparisonDate = new Date(maxCoveredDate);
        comparisonDate.setHours(23, 59, 59, 999);
      }

      // Find all transactions for this sales that are AFTER their max covered date
      const outstandingTxs = transactions.filter(tx => {
        if (tx.salesName !== name) return false;
        if (!comparisonDate) return true; // if no deposit yet, all transactions are outstanding
        const txDate = new Date(tx.tanggal);
        return txDate > comparisonDate;
      });

      // Sum packs and omset for these outstanding transactions
      const outstandingPacks = outstandingTxs.reduce((sum, tx) => sum + tx.qtyPacks, 0);
      const outstandingOmset = outstandingTxs.reduce((sum, tx) => sum + tx.omset, 0);

      // Find active/unarchived underpaid deposits for this sales rep
      const activeKurangSetorDeposits = salesDeposits.filter(dep => !dep.archived && dep.statusSetoran === 'Kurang Setor');
      const totalKurangSetorNominal = activeKurangSetorDeposits.reduce((sum, dep) => sum + dep.selisihSetoran, 0);
      const totalTagihanTerutang = outstandingOmset + totalKurangSetorNominal;

      // Find dates range of outstanding transactions
      let startDateStr = '';
      let endDateStr = '';
      if (outstandingTxs.length > 0) {
        const sortedDates = outstandingTxs
          .map(tx => new Date(tx.tanggal))
          .sort((a, b) => a.getTime() - b.getTime());
        startDateStr = formatDateIndo(sortedDates[0]);
        endDateStr = formatDateIndo(sortedDates[sortedDates.length - 1]);
      }

      // Calculate days elapsed since last covered date
      let daysElapsed = 0;
      if (maxCoveredDate) {
        const diffTime = Math.abs(Date.now() - maxCoveredDate.getTime());
        daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else if (transactions.filter(tx => tx.salesName === name).length > 0) {
        // Find earliest transaction date if no deposits
        const dates = transactions
          .filter(tx => tx.salesName === name)
          .map(tx => new Date(tx.tanggal));
        if (dates.length > 0) {
          const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
          const diffTime = Math.abs(Date.now() - earliest.getTime());
          daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      return {
        salesName: name,
        lastCoveredDate: maxCoveredDate,
        outstandingPacks,
        outstandingOmset,
        outstandingCount: outstandingTxs.length,
        daysElapsed,
        periodString: outstandingTxs.length > 0 ? `${startDateStr} - ${endDateStr}` : '',
        totalKurangSetorNominal,
        kurangSetorDeposits: activeKurangSetorDeposits,
        totalTagihanTerutang,
        status: outstandingOmset > 0 
          ? (daysElapsed >= 4 ? 'critical' : 'warning') 
          : 'ok'
      };
    });
  }, [transactions, deposits, salesNames, loggedInSalesName]);

  // --- STATS CALCULATOR ---
  const activeDeposits = useMemo(() => {
    return deposits.filter(dep => {
      if (dep.archived) return false;
      if (loggedInSalesName && dep.salesName.toLowerCase().trim() !== loggedInSalesName.toLowerCase().trim()) {
        return false;
      }
      return true;
    });
  }, [deposits, loggedInSalesName]);

  const stats = useMemo(() => {
    let totalOmsetPeriod = 0;
    let totalSetoranUang = 0;
    let totalKurangSetor = 0;
    let totalLebihSetor = 0;

    activeDeposits.forEach(dep => {
      totalOmsetPeriod += dep.totalOmsetInPeriod;
      totalSetoranUang += dep.jumlahDisetor;
      if (dep.statusSetoran === 'Kurang Setor') {
        totalKurangSetor += dep.selisihSetoran;
      } else if (dep.statusSetoran === 'Lebih Setor') {
        totalLebihSetor += dep.selisihSetoran;
      }
    });

    const outstandingReconciledTotal = reconciliationData.reduce((sum, item) => sum + item.outstandingOmset, 0);

    return {
      totalOmsetPeriod,
      totalSetoranUang,
      totalKurangSetor,
      totalLebihSetor,
      outstandingReconciledTotal
    };
  }, [activeDeposits, reconciliationData]);

  // --- FILTERED DEPOSITS LIST ---
  const filteredDeposits = useMemo(() => {
    return deposits.filter(dep => {
      if (loggedInSalesName && dep.salesName.toLowerCase().trim() !== loggedInSalesName.toLowerCase().trim()) {
        return false;
      }
      const matchesSearch = dep.salesName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (dep.keterangan || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        filterStatus === 'All' ? true :
        filterStatus === 'Lunas' ? dep.statusSetoran === 'Lunas' :
        filterStatus === 'Kurang' ? dep.statusSetoran === 'Kurang Setor' :
        dep.statusSetoran === 'Lebih Setor';

      const matchesArchive = 
        archiveFilter === 'all' ? true :
        archiveFilter === 'archived' ? !!dep.archived :
        !dep.archived;

      return matchesSearch && matchesStatus && matchesArchive;
    });
  }, [deposits, searchTerm, filterStatus, archiveFilter, loggedInSalesName]);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-xs font-black tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header Section */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Wallet className="w-52 h-52 text-amber-500" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Kontrol Setoran Keuangan
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">Manajemen Setoran Sales</h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Catat setoran harian sales berdasarkan realisasi penjualannya secara presisi, kelola selisih kurang/lebih setor, dan pantau piutang kas yang tertunda.
            </p>
          </div>

          {!loggedInSalesName && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/10"
              >
                <Plus className="w-4 h-4 stroke-[3px]" />
                Catat Setoran Baru
              </button>
              <button
                onClick={() => setShowArchiveConfirmModal(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-600/10 border border-rose-700/50"
              >
                <Archive className="w-4 h-4" />
                Tutup Buku / Kosongkan Data
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Financial Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Omset dalam Periode Terbayar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all">
          <div className="w-12 h-12 bg-slate-100 text-slate-800 rounded-xl flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Omset Penjualan Tercover</span>
            <h3 className="text-lg font-black text-slate-900">{formatIDR(stats.totalOmsetPeriod)}</h3>
            <p className="text-[9px] font-medium text-slate-500">Nilai rill barang yang dilaporkan</p>
          </div>
        </div>

        {/* Total Setoran Diterima */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Setoran Masuk (Kas)</span>
            <h3 className="text-lg font-black text-emerald-600">{formatIDR(stats.totalSetoranUang)}</h3>
            <p className="text-[9px] font-medium text-slate-500">Uang tunai yang telah diserah-terimakan</p>
          </div>
        </div>

        {/* Total Piutang Kurang Setor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Total Kurang Setor</span>
            <h3 className="text-lg font-black text-amber-600">{formatIDR(stats.totalKurangSetor)}</h3>
            <p className="text-[9px] font-medium text-amber-600">Sisa tagihan kas ke sales</p>
          </div>
        </div>

        {/* Pending Sales (Not Yet Deposited) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Belum Disetor (Tertunda)</span>
            <h3 className="text-lg font-black text-rose-600">{formatIDR(stats.outstandingReconciledTotal)}</h3>
            <p className="text-[9px] font-medium text-slate-500">Omset lapangan belum dibuatkan setoran</p>
          </div>
        </div>

      </div>

      {/* Reconciliation Assistant (Analisis Setoran Terlambat) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Reconciliation Assistant (Asisten Pengawasan Setoran)</h3>
              <p className="text-[10px] text-slate-500">Menganalisis transaksi sales yang belum disetor sejak setoran terakhir mereka.</p>
            </div>
          </div>
          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
            Auto-Audit Real-time
          </span>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reconciliationData.map(item => (
              <div 
                key={item.salesName}
                className={`p-4 rounded-xl border transition-all ${
                  item.status === 'critical'
                    ? 'bg-rose-50/50 border-rose-200/60 shadow-sm shadow-rose-100'
                    : item.status === 'warning'
                    ? 'bg-amber-50/40 border-amber-200/60 shadow-sm shadow-amber-50/50'
                    : 'bg-slate-50/30 border-slate-200/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {item.salesName}
                    </h4>
                    <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                      Setoran terakhir: {item.lastCoveredDate ? formatDateIndo(item.lastCoveredDate) : 'Belum Pernah'}
                    </p>
                  </div>

                  {item.outstandingOmset > 0 ? (
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'critical' 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {item.daysElapsed} Hari Tertunda
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Terbuku Rapi
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100/80 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Sisa Barang Belum Setor</span>
                    <span className="text-[11px] font-black text-slate-800">{item.outstandingPacks} Packs</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Nilai Omset Lapangan</span>
                    <span className="text-[11px] font-black text-slate-800">{formatIDR(item.outstandingOmset)}</span>
                  </div>
                </div>

                {item.outstandingOmset > 0 && (
                  <div className="mt-2 bg-white p-2 rounded-lg border border-slate-100 text-[10px] text-slate-600 leading-relaxed font-semibold">
                    <span className="text-slate-400 font-bold uppercase text-[8px] block tracking-wider">Penjualan Belum Setor:</span>
                    {item.periodString}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Ledger Table and Filter Section */}
      <div id="setoran_table" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Table Filters Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Buku Besar Setoran Sales</h3>
              {!loggedInSalesName && (
                <button
                  type="button"
                  onClick={handleResetBukuBesar}
                  className="text-[9px] font-black text-rose-600 hover:text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-200/50 px-2 py-0.5 rounded transition-all uppercase flex items-center gap-0.5"
                  title="Reset dan Kosongkan Catatan Buku Besar Setoran"
                >
                  <Trash2 className="w-2.5 h-2.5" /> Reset
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Sistem penelusuran histori kas setoran sales</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari sales / keterangan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs font-semibold pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
            </div>

            {/* Filter Status */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {([
                { id: 'All', label: 'Semua' },
                { id: 'Lunas', label: 'Lunas' },
                { id: 'Kurang', label: 'Kurang' },
                { id: 'Lebih', label: 'Lebih' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${
                    filterStatus === tab.id 
                      ? 'bg-white text-slate-950 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter Arsip */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {([
                { id: 'active', label: 'Daftar Aktif' },
                { id: 'archived', label: 'Arsip (Riwayat)' },
                { id: 'all', label: 'Semua Data' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setArchiveFilter(tab.id)}
                  className={`px-2.5 py-1 text-[9px] font-black rounded-md transition-all ${
                    archiveFilter === tab.id 
                      ? 'bg-white text-slate-950 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="py-3 px-4">Nama Sales</th>
                <th className="py-3 px-4">Tanggal Setor</th>
                <th className="py-3 px-4">Rentang Penjualan</th>
                <th className="py-3 px-4 text-center">Volume (Packs)</th>
                <th className="py-3 px-4 text-right">Target Omset</th>
                <th className="py-3 px-4 text-right">Uang Disetor</th>
                <th className="py-3 px-4 text-right">Selisih Setor</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold">
                    Tidak ada record setoran sales yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map(dep => {
                  return (
                    <tr key={dep.id} className="hover:bg-slate-50/40 transition-colors">
                      
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{dep.salesName}</div>
                        <div className="text-[9px] font-mono font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>{dep.id}</span>
                          {dep.archived && (
                            <span className="bg-slate-100 text-slate-500 text-[8px] px-1 rounded font-sans font-bold">
                              📁 Terarsip
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tanggal Setor */}
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {formatDateIndo(dep.tanggalSetor)}
                      </td>

                      {/* Rentang Penjualan */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <span>{formatDateIndo(dep.tanggalMulaiPeriode)}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatDateIndo(dep.tanggalSelesaiPeriode)}</span>
                        </div>
                        {dep.keterangan && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs truncate" title={dep.keterangan}>
                            "{dep.keterangan}"
                          </div>
                        )}
                      </td>

                      {/* Volume */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {dep.qtyPacksInPeriod} Packs
                      </td>

                      {/* Target Omset */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatIDR(dep.totalOmsetInPeriod)}
                      </td>

                      {/* Uang Disetor */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600 bg-emerald-50/10">
                        {formatIDR(dep.jumlahDisetor)}
                      </td>

                      {/* Selisih */}
                      <td className={`py-3.5 px-4 text-right font-bold ${
                        dep.statusSetoran === 'Kurang Setor'
                          ? 'text-rose-600 bg-rose-50/20'
                          : dep.statusSetoran === 'Lebih Setor'
                          ? 'text-indigo-600 bg-indigo-50/20'
                          : 'text-slate-400'
                      }`}>
                        {dep.statusSetoran === 'Lunas' ? '-' : formatIDR(dep.selisihSetoran)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border ${
                          dep.statusSetoran === 'Lunas'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : dep.statusSetoran === 'Kurang Setor'
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {dep.statusSetoran}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          
                          {/* Restore Button (Pulihkan) if archived */}
                          {dep.archived ? (
                            <button
                              onClick={() => handleRestoreDeposit(dep.id)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-black px-2 py-1 rounded text-[10px] transition-all border border-amber-200 flex items-center gap-0.5"
                              title="Pulihkan ke Daftar Aktif"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-600" /> Pulihkan
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedDeposit(dep);
                                  setShowReceiptModal(true);
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-2 py-1 rounded text-[10px] transition-all border border-slate-200 flex items-center gap-0.5"
                                title="Cetak Tanda Terima"
                              >
                                <Printer className="w-3 h-3 text-slate-500" /> Tanda Terima
                              </button>
                              {dep.statusSetoran === 'Kurang Setor' && (
                                <button
                                  onClick={() => {
                                    setSettlingDeposit(dep);
                                    setSettleAmount(dep.selisihSetoran.toString());
                                    setSettleKeterangan('');
                                    setShowSettleModal(true);
                                  }}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded text-[10px] transition-all border border-rose-200 flex items-center gap-0.5"
                                  title="Bayar Sisa Kurang Setor"
                                >
                                  <Coins className="w-3 h-3 text-rose-600" /> Bayar Sisa
                                </button>
                              )}
                            </>
                          )}

                          {/* Delete button */}
                          {!loggedInSalesName && (
                            <button
                              onClick={() => handleDeleteDeposit(dep.id)}
                              className="bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 px-1.5 py-1 rounded border border-slate-200 hover:border-rose-200 transition-all"
                              title="Hapus Permanen"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL 1: ADD SETORAN SALES */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-8"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-xs font-bold">Catat Setoran Uang Sales</h4>
                    <p className="text-[10px] text-slate-400">Hubungkan setoran kas dengan omset lapangan</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleAddDeposit} className="p-6 space-y-4">
                
                {/* Sales Name Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">Nama Sales Representative</label>
                  <select
                    required
                    value={formSales}
                    onChange={(e) => setFormSales(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- Pilih Sales --</option>
                    {salesNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Tanggal Setor Kas */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">Tanggal Setoran (Kas Diterima)</label>
                  <input
                    type="date"
                    required
                    value={formTanggalSetor}
                    onChange={(e) => setFormTanggalSetor(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Periode Penjualan */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">Periode Hari Penjualan yang Disetor</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block mb-1">Mulai Tanggal</span>
                      <input
                        type="date"
                        required
                        value={formTanggalMulai}
                        onChange={(e) => setFormTanggalMulai(e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block mb-1">Sampai Tanggal</span>
                      <input
                        type="date"
                        required
                        value={formTanggalSelesai}
                        onChange={(e) => setFormTanggalSelesai(e.target.value)}
                        className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive Auto-Audit / Sales Summary for Period */}
                {formSales && formTanggalMulai && formTanggalSelesai && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 font-bold text-slate-700">
                      <span className="text-slate-500">Estimasi Kinerja di Lapangan:</span>
                      <span className="text-slate-900">{formSales}</span>
                    </div>
                    {periodSalesSummary.count > 0 ? (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">Total Kunjungan Order</span>
                          <span className="font-extrabold text-slate-800">{periodSalesSummary.count} Toko</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 block">Volume Terjual</span>
                          <span className="font-extrabold text-slate-800">{periodSalesSummary.qtyPacks} Packs</span>
                        </div>
                        <div className="col-span-2 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 flex justify-between items-center mt-1">
                          <span className="font-bold text-[10px] text-amber-800 uppercase tracking-wider">TARGET SETORAN OMSET</span>
                          <span className="font-black text-slate-900 text-xs">{formatIDR(periodSalesSummary.totalOmset)}</span>
                        </div>
                      </div>
                    ) : periodSalesSummary.rawCount > 0 ? (
                      <div className="space-y-2 py-1">
                        <div className="grid grid-cols-2 gap-3 pt-1 opacity-60">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block">Total Kunjungan Order</span>
                            <span className="font-extrabold text-slate-800">0 Toko</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 block">Volume Terjual</span>
                            <span className="font-extrabold text-slate-800">0 Packs</span>
                          </div>
                          <div className="col-span-2 bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex justify-between items-center mt-1">
                            <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">TARGET SETORAN OMSET</span>
                            <span className="font-black text-slate-400 text-xs">{formatIDR(0)}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-emerald-600 font-extrabold text-center bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                          ✅ Semua transaksi ({periodSalesSummary.rawQtyPacks} Packs) pada rentang tanggal ini sudah disetorkan sebelumnya! Sisa belum setoran adalah 0.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-rose-600 font-semibold italic text-center py-1">
                        ⚠️ Tidak ada transaksi penjualan tercatat untuk {formSales} di rentang tanggal tersebut!
                      </p>
                    )}
                  </div>
                )}

                {/* Amount Deposited */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">Uang Fisik yang Disetor (Setoran Kas)</label>
                    {periodSalesSummary.totalOmset > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormJumlahDisetor(periodSalesSummary.totalOmset)}
                        className="text-[9px] font-black text-amber-600 hover:text-amber-700 uppercase"
                      >
                        Gunakan Uang Pas (Lunas)
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                    <input
                      type="number"
                      required
                      disabled={periodSalesSummary.totalOmset === 0}
                      placeholder={periodSalesSummary.totalOmset === 0 ? "0" : "Contoh: 840000"}
                      value={periodSalesSummary.totalOmset === 0 ? "0" : formJumlahDisetor}
                      onChange={(e) => setFormJumlahDisetor(e.target.value)}
                      className="w-full text-xs font-extrabold border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">Keterangan Tambahan / Catatan Lapangan</label>
                  <textarea
                    placeholder="Contoh: Kurang setor karena denda, ada nota gantung, dll."
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    rows={2}
                    className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Submit buttons */}
                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl py-3 transition-all text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={periodSalesSummary.totalOmset === 0}
                    className={`flex-1 text-xs font-extrabold rounded-xl py-3 transition-all text-center ${
                      periodSalesSummary.totalOmset === 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                        : 'text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/10'
                    }`}
                  >
                    Simpan Setoran
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RECEIPT MODAL (TANDA TERIMA SETORAN) */}
      <AnimatePresence>
        {showReceiptModal && selectedDeposit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 xs:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden my-auto"
            >
              <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-amber-500" /> Tanda Terima Kasir
                </span>
                <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Simulated Paper Receipt Layout */}
              <div className="p-3 xs:p-5 bg-slate-50/50">
                <div className="bg-white p-3.5 xs:p-5 rounded-xl border border-slate-200 shadow-sm font-mono text-[10px] xs:text-[11px] text-slate-800 space-y-3 xs:space-y-4 overflow-hidden">
                  
                  {/* Brand logo */}
                  <div className="text-center pb-3 border-b border-dashed border-slate-300 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 text-amber-500 mb-1">
                      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* 1. Hollow diamond below */}
                        <polygon points="25,51 37,63 25,75 13,63" stroke="#f59e0b" strokeWidth="4.5" fill="none" />
                        
                        {/* 2. Solid Diamond on Top with a white masking border */}
                        <polygon points="25,31 38,44 25,57 12,44" fill="#f59e0b" stroke="#ffffff" strokeWidth="3" strokeLinejoin="miter" />
                        
                        {/* 3. Stylized M */}
                        <polygon points="25,0 25,18 62.5,55 87.5,18 87.5,75 100,75 100,0 62.5,37" fill="#f59e0b" />
                      </svg>
                    </div>
                    <h5 className="font-extrabold text-sm xs:text-base text-slate-900 tracking-widest uppercase">MAKAYASA</h5>
                    <p className="text-[7.5px] xs:text-[8.5px] text-amber-600 font-extrabold uppercase tracking-wider mt-0.5">PR. MAHAPUTERA NUSANTARA</p>
                    <p className="text-[7px] xs:text-[8px] text-slate-400 uppercase tracking-widest font-bold mt-1.5">Bukti Tanda Terima Setoran Kasir</p>
                    <p className="text-[7px] xs:text-[8px] text-slate-400 font-sans mt-0.5">Tanggal: {formatDateIndo(selectedDeposit.tanggalSetor)}</p>
                  </div>

                  {/* TX ID and Sales Name */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2 min-w-0">
                      <span className="shrink-0 text-slate-500">No. Ref:</span>
                      <span className="font-bold text-slate-900 break-all text-right">{selectedDeposit.id}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2 min-w-0">
                      <span className="shrink-0 text-slate-500">Penerima:</span>
                      <span className="font-bold text-slate-900 text-right">Komandan Makayasa</span>
                    </div>
                    <div className="flex justify-between items-start gap-2 min-w-0">
                      <span className="shrink-0 text-slate-500">Salesman:</span>
                      <span className="font-bold text-slate-900 break-all text-right">{selectedDeposit.salesName}</span>
                    </div>
                  </div>

                  {/* Sales Period covered */}
                  <div className="bg-slate-50 p-2 xs:p-2.5 rounded border border-slate-200/60 space-y-1 text-[9px] xs:text-[10px] min-w-0">
                    <div className="font-bold text-[7px] xs:text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">PERIODE PENJUALAN:</div>
                    <div className="flex justify-between items-start gap-2 min-w-0">
                      <span className="shrink-0">Mulai:</span>
                      <span className="text-right">{formatDateIndo(selectedDeposit.tanggalMulaiPeriode)}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2 min-w-0">
                      <span className="shrink-0">Sampai:</span>
                      <span className="text-right">{formatDateIndo(selectedDeposit.tanggalSelesaiPeriode)}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2 min-w-0 font-bold text-slate-700 mt-1 pt-1 border-t border-slate-200">
                      <span className="shrink-0">Volume:</span>
                      <span className="text-right">{selectedDeposit.qtyPacksInPeriod} Packs</span>
                    </div>
                  </div>

                  {/* Product Details Section */}
                  <div className="bg-slate-50 p-2 xs:p-2.5 rounded border border-slate-200/60 text-[9px] xs:text-[10px] min-w-0 space-y-1.5">
                    <div className="font-bold text-[7px] xs:text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">DETAIL PRODUK:</div>
                    <div className="grid grid-cols-12 gap-1 font-bold text-slate-500 border-b border-slate-200 pb-1 text-[8px] xs:text-[9px]">
                      <div className="col-span-6">Nama Produk</div>
                      <div className="col-span-2 text-right">Qty</div>
                      <div className="col-span-4 text-right">Nominal</div>
                    </div>
                    <div className="grid grid-cols-12 gap-1 text-slate-800 pt-0.5 font-sans">
                      <div className="col-span-6 font-medium text-slate-950">Makayasa Kretek 12</div>
                      <div className="col-span-2 text-right font-bold">{selectedDeposit.qtyPacksInPeriod} Pk</div>
                      <div className="col-span-4 text-right font-bold text-slate-900">{formatIDR(selectedDeposit.totalOmsetInPeriod)}</div>
                    </div>
                  </div>

                  {/* Financial calculation details */}
                  <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-300 min-w-0">
                    <div className="flex justify-between items-start gap-2 min-w-0 text-slate-500">
                      <span className="shrink-0">Target Omset:</span>
                      <span className="text-right">{formatIDR(selectedDeposit.totalOmsetInPeriod)}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2 min-w-0 font-bold text-emerald-600">
                      <span className="shrink-0">Fisik Disetor:</span>
                      <span className="text-right">{formatIDR(selectedDeposit.jumlahDisetor)}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2 min-w-0 font-bold text-slate-800">
                      <span className="shrink-0">Status:</span>
                      <span className="text-right">{selectedDeposit.statusSetoran}</span>
                    </div>
                    {selectedDeposit.statusSetoran !== 'Lunas' && (
                      <div className={`flex justify-between items-start gap-2 min-w-0 font-black ${
                        selectedDeposit.statusSetoran === 'Kurang Setor' ? 'text-rose-600' : 'text-indigo-600'
                      }`}>
                        <span className="shrink-0">Selisih:</span>
                        <span className="text-right">{formatIDR(selectedDeposit.selisihSetoran)}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Notes */}
                  {selectedDeposit.keterangan && (
                    <div className="bg-slate-50/50 p-2 rounded text-[9px] xs:text-[10px] italic text-slate-500 break-words">
                      Catatan: "{selectedDeposit.keterangan}"
                    </div>
                  )}

                  {/* Signature block */}
                  <div className="pt-3 flex justify-between text-[9px] xs:text-[10px] text-center text-slate-400 font-sans gap-2 min-w-0">
                    <div className="w-1/2 min-w-0">
                      <p className="mb-6 truncate text-slate-500">Menyerahkan,</p>
                      <p className="font-bold text-slate-700 underline truncate">{selectedDeposit.salesName}</p>
                      <p className="text-[8px] text-slate-400 truncate">Salesman</p>
                    </div>
                    <div className="w-1/2 min-w-0">
                      <p className="mb-6 truncate text-slate-500">Menerima,</p>
                      <p className="font-bold text-slate-700 underline truncate">Komandan</p>
                      <p className="text-[8px] text-slate-400 truncate">Kasir Makayasa</p>
                    </div>
                  </div>

                  <div className="text-center text-[7px] text-slate-400 pt-2 border-t border-dashed border-slate-300 break-words">
                    Terima kasih atas dedikasi dan kejujuran Anda dalam bekerja!
                  </div>

                </div>
                
                {/* Print confirmation and exit */}
                <div className="mt-4 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDownloadReceiptPDF(selectedDeposit)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] xs:text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Download className="w-3 h-3 xs:w-3.5 xs:h-3.5" /> Unduh PDF
                    </button>
                    <button
                      onClick={() => handleDownloadReceiptPNG(selectedDeposit)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] xs:text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Download className="w-3 h-3 xs:w-3.5 xs:h-3.5" /> Unduh PNG
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / Cetak Fisik
                  </button>
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2 rounded-xl transition-all"
                  >
                    Tutup
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ARCHIVE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showArchiveConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-amber-500" />
                  <div>
                    <h4 className="text-xs font-bold">Mulai Periode Baru / Arsipkan Data</h4>
                    <p className="text-[10px] text-slate-400">Kosongkan statistik aktif & simpan ke riwayat</p>
                  </div>
                </div>
                <button onClick={() => setShowArchiveConfirmModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-xs leading-relaxed space-y-2">
                  <p className="font-extrabold flex items-center gap-1 text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    BAGAIMANA CARA KERJA FITUR INI?
                  </p>
                  <p className="font-semibold text-[11px]">
                    Fitur ini akan mengosongkan statistik panel utama (Kas Diterima, Kurang Setor, dll.) kembali menjadi <strong className="text-amber-900">NOL (0)</strong> untuk memulai siklus keuangan/setoran yang baru.
                  </p>
                  <p className="font-semibold text-[11px]">
                    Semua setoran yang diarsipkan akan <strong className="text-amber-900">TETAP DISIMPAN</strong> dan bisa diakses kapan saja melalui tab <strong className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">Arsip (Riwayat)</strong> di tabel bawah.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">PILIH METODE PENUTUPAN BUKU</label>
                  
                  {/* Option 1: Archive Lunas Only */}
                  <button
                    onClick={() => handleArchiveDeposits('lunas')}
                    className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-start gap-3 group"
                  >
                    <span className="w-8 h-8 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                    <div className="flex-1">
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Arsip Hanya yang LUNAS</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Sangat Direkomendasikan. Hanya mengosongkan setoran yang lunas. Setoran yang masih berstatus Kurang Setor (piutang) tetap tampil aktif untuk dipantau penagihannya.</p>
                    </div>
                  </button>

                  {/* Option 2: Archive All */}
                  <button
                    onClick={() => {
                      if (window.confirm("Apakah Anda yakin ingin mengarsipkan seluruh setoran termasuk yang KURANG SETOR?")) {
                        handleArchiveDeposits('all');
                      }
                    }}
                    className="w-full text-left p-3.5 bg-rose-50/30 hover:bg-rose-50/60 border border-rose-100 rounded-xl transition-all flex items-start gap-3 group"
                  >
                    <span className="w-8 h-8 bg-rose-50 text-rose-600 group-hover:bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                      <Archive className="w-5 h-5" />
                    </span>
                    <div className="flex-1">
                      <h5 className="text-xs font-bold text-rose-900 group-hover:text-rose-700 transition-colors">Arsip SELURUH Setoran</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Memindahkan semua catatan setoran aktif ke dalam riwayat tanpa terkecuali, baik yang sudah lunas maupun yang kurang/lebih setor.</p>
                    </div>
                  </button>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowArchiveConfirmModal(false)}
                    className="flex-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl py-2.5 transition-all text-center"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: SETTLE UNDERPAYMENT (LUNASI KURANG SETOR) */}
      <AnimatePresence>
        {showSettleModal && settlingDeposit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden my-8"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-rose-500" />
                  <div>
                    <h4 className="text-xs font-bold">Pelunasan Kekurangan Setoran</h4>
                    <p className="text-[10px] text-slate-400">Bayar sisa kas yang tertunda untuk salesman</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setShowSettleModal(false);
                    setSettlingDeposit(null);
                  }} 
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSettleUnderpayment} className="p-5 space-y-4">
                
                {/* Sales Representative Name Info */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Nama Salesman:</span>
                    <span className="font-extrabold text-slate-900">{settlingDeposit.salesName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">ID Record:</span>
                    <span className="font-mono text-slate-500 font-bold">{settlingDeposit.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Periode Penjualan:</span>
                    <span className="font-extrabold text-slate-700">
                      {formatDateIndo(settlingDeposit.tanggalMulaiPeriode)} - {formatDateIndo(settlingDeposit.tanggalSelesaiPeriode)}
                    </span>
                  </div>
                </div>

                {/* Amount details */}
                <div className="grid grid-cols-2 gap-3 bg-rose-50/20 p-3.5 rounded-xl border border-rose-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[8px] block tracking-wider">Target Omset</span>
                    <span className="font-black text-slate-800 text-[13px]">{formatIDR(settlingDeposit.totalOmsetInPeriod)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[8px] block tracking-wider">Sudah Disetor</span>
                    <span className="font-black text-slate-800 text-[13px]">{formatIDR(settlingDeposit.jumlahDisetor)}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-rose-100 flex justify-between items-center">
                    <span className="font-black text-[9px] text-rose-600 uppercase tracking-wider">SISA KEKURANGAN (PIUTANG):</span>
                    <span className="font-black text-rose-700 text-sm">{formatIDR(settlingDeposit.selisihSetoran)}</span>
                  </div>
                </div>

                {/* Input Settle Amount */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Nominal Pembayaran Tambahan (IDR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                    <input
                      type="number"
                      required
                      min="1"
                      max={settlingDeposit.selisihSetoran * 2}
                      placeholder={`Contoh: ${settlingDeposit.selisihSetoran}`}
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(e.target.value)}
                      className="w-full text-xs font-extrabold border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setSettleAmount(settlingDeposit.selisihSetoran.toString())}
                      className="text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      Gunakan Uang Pas (Lunas)
                    </button>
                  </div>
                </div>

                {/* Input Settle Notes */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Keterangan / Catatan Pelunasan</label>
                  <textarea
                    placeholder="Contoh: Dititipkan lewat admin, lunas kasir..."
                    value={settleKeterangan}
                    onChange={(e) => setSettleKeterangan(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-rose-500 h-16 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettleModal(false);
                      setSettlingDeposit(null);
                    }}
                    className="flex-1 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl py-3 transition-all text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 rounded-xl py-3 transition-all text-center shadow-lg shadow-rose-600/10"
                  >
                    Simpan Pelunasan
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
