/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  tanggal: Date;
  salesName: string;
  storeName: string;
  storeAddress: string;
  qtyPacks: number;
  omset: number;
  statusKunjungan: 'Baru Order' | 'Tidak Order' | 'Repeat Order';
  kecamatan?: string;
  desa?: string;
  transaksiKe?: string;
  statusToko?: 'Toko / Outlet' | 'Konsumen / End User';
  rawStatusToko?: string;
}

export interface SalesPerformance {
  name: string;
  totalPacks: number;
  totalOmset: number;
  totalVisits: number;
  totalOrders: number;
  regularOrders: number;
  repeatOrders: number;
  noOrders: number;
  successRate: number;
}

export interface StoreMetric {
  name: string;
  address: string;
  region: string;
  totalPurchasesPacks: number;
  totalOmset: number;
  repeatCount: number;
  lastVisit: Date;
  salesName: string;
  kecamatan?: string;
  desa?: string;
  transaksiKe?: string;
  statusToko?: 'Toko / Outlet' | 'Konsumen / End User';
}

export interface RegionMetric {
  name: string;
  totalStores: number;
  totalPacks: number;
  totalOmset: number;
}

export interface FilterOption {
  type: 'today' | 'yesterday' | 'range' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
}

export interface SalesAccount {
  id: string;
  salesName: string;
  username: string;
  password: string;
}

export interface AppConfig {
  spreadsheetUrl: string;
  appScriptUrl: string;
  pricePerPack: number;
  mode: 'live' | 'demo';
  brandName?: string;
  brandSubtitle?: string;
  brandLogoInitials?: string;
  ownerName?: string;
  ownerRole?: string;
  ownerInitials?: string;
  loginUsername?: string;
  loginPassword?: string;
  salesAccounts?: SalesAccount[];
  serverBaseUrl?: string;
}

export interface StockEntry {
  id: string;
  tanggal: Date;
  tipe: 'Masuk' | 'Keluar';
  sumberTujuan: string;
  jumlah: number; // in packs
  keterangan: string;
  sumberInput: 'Aplikasi' | 'Spreadsheet';
  hanyaSales?: boolean;
  salesName?: string;
  isReversed?: boolean;
  reversedAt?: string;
}

export interface FreelanceRecord {
  id: string;
  tanggalAmbil: Date;
  namaFreelance: string;
  qtyPacks: number;
  pricePerPack: number;
  totalOmset: number;
  statusPembayaran: 'Belum Bayar' | 'Cicil' | 'Lunas';
  jumlahDibayar: number;
  kurangBayar: number;
  keterangan?: string;
  potongStokGudang: boolean;
  returPacks?: number; // Jumlah rokok retur/kembali
  tanggalLunas?: Date;
  archived?: boolean; // Flag to indicate if transaction is archived/historical
}

export interface SalesDeposit {
  id: string;
  tanggalSetor: Date;
  salesName: string;
  tanggalMulaiPeriode: Date;
  tanggalSelesaiPeriode: Date;
  qtyPacksInPeriod: number;
  totalOmsetInPeriod: number;
  jumlahDisetor: number;
  selisihSetoran: number; // totalOmsetInPeriod - jumlahDisetor
  statusSetoran: 'Lunas' | 'Kurang Setor' | 'Lebih Setor';
  keterangan?: string;
  archived?: boolean;
}

export interface ExpenseRecord {
  id: string;
  tanggal: Date;
  kategori: 'Marketing' | 'Transfer Pabrik' | 'Operasional' | 'Gaji & Komisi' | 'Sewa & Logistik' | 'Lainnya' | 'Biaya Tester/Promosi';
  nominal: number;
  keterangan: string;
}



