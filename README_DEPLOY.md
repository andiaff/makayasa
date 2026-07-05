# Panduan Penyebaran (Deployment) & Arsitektur Sinkronisasi

Aplikasi **Makayasa Jember Command Center** dirancang dengan arsitektur modern berkinerja tinggi, berbasis **React + Vite + Tailwind CSS** di sisi klien (Single Page Application - SPA) dan tersinkronisasi secara real-time menggunakan **Firebase Firestore**.

Panduan ini menjelaskan cara menyebarkan aplikasi ini ke **GitHub** dan **Vercel**, serta bagaimana arsitektur aplikasi ini bekerja agar mudah dikembangkan di masa mendatang.

---

## 🚀 1. Penyebaran ke GitHub & Vercel

Karena aplikasi ini adalah SPA murni di sisi klien yang langsung berinteraksi dengan Firebase SDK, aplikasi ini **100% kompatibel untuk dideploy di Vercel, Netlify, atau GitHub Pages secara gratis**.

### Langkah-langkah Penyebaran ke Vercel:

1. **Simpan Kode ke GitHub**:
   - Buat repositori baru di akun GitHub Anda (misal: `makayasa-jember`).
   - Push seluruh kode dari folder ini ke repositori tersebut.

2. **Hubungkan ke Vercel**:
   - Masuk ke dashboard [Vercel](https://vercel.com).
   - Klik **Add New** -> **Project**.
   - Impor repositori GitHub `makayasa-jember` yang baru Anda buat.

3. **Atur Variabel Lingkungan (Environment Variables) - OPSIONAL**:
   Vercel mendukung penyebaran aman tanpa perlu mempublikasikan file konfigurasi mentah ke GitHub publik. Anda dapat menambahkan variabel lingkungan berikut pada menu **Environment Variables** di Vercel (bisa disalin dari file `.env.example` di repositori Anda):
   * `VITE_FIREBASE_PROJECT_ID`
   * `VITE_FIREBASE_APP_ID`
   * `VITE_FIREBASE_API_KEY`
   * `VITE_FIREBASE_AUTH_DOMAIN`
   * `VITE_FIREBASE_DATABASE_ID`
   * `VITE_FIREBASE_STORAGE_BUCKET`
   * `VITE_FIREBASE_MESSAGING_SENDER_ID`
   
   *Catatan: Jika Anda membiarkan `firebase-applet-config.json` tetap terunggah di GitHub, Vercel akan otomatis menggunakannya secara default tanpa konfigurasi tambahan.*

4. **Deploy**:
   - Klik tombol **Deploy**. Vercel akan membaca konfigurasi `vite.config.ts`, menjalankan perintah `npm run build`, dan meluncurkan aplikasi Anda dalam hitungan detik!

---

## 📱 2. Sinkronisasi Real-Time Lintas Perangkat

Aplikasi ini menggunakan sistem **Hybrid Local-Cloud Sync**. Setiap pembaruan data yang diinput dari PC, tablet, maupun HP akan langsung disinkronkan ke seluruh perangkat secara real-time.

### Cara Kerja:
1. **Interseptor State Lokal**:
   - Ketika Anda menambah/mengubah setoran, pengeluaran, catatan freelance, atau stok di aplikasi, data disimpan di `localStorage` perangkat tersebut.
   - Utilitas `src/utils/firebaseSync.ts` mendeteksi perubahan ini dan langsung mengunggahnya ke Firestore secara efisien.

2. **Pendengar Snapshot Server (onSnapshot)**:
   - Seluruh perangkat yang sedang membuka aplikasi berlangganan ke koleksi Firestore menggunakan pendengar real-time.
   - Begitu ada data baru di cloud (misal: HP menginput pengeluaran baru), perangkat lain (misal: PC kantor) akan langsung menerima pembaruan tersebut dan memicu event `makayasa_sync_update`.
   - Komponen React mendeteksi event ini dan memperbarui tampilan secara otomatis tanpa perlu memuat ulang halaman (reload).

---

## 🛠️ 3. Pondasi Masa Depan yang Mudah Dikembangkan

Pondasi sinkronisasi aplikasi ini dibangun agar **sangat mudah dikembangkan** untuk tahap selanjutnya. Developer masa depan dapat menambah modul baru dalam waktu **2 menit** tanpa mengganggu sistem yang sudah berjalan.

### Cara Menambah Koleksi/Modul Baru yang Tersinkronisasi:

Jika Anda ingin menambahkan fitur baru di masa mendatang (misal: "Kehadiran Karyawan" atau `makayasa_attendance`):

1. **Tambahkan Kunci di `src/utils/firebaseSync.ts`**:
   Buka file tersebut dan tambahkan pemetaan penyimpanan lokal ke koleksi database pada objek `SYNC_KEYS`:
   ```typescript
   const SYNC_KEYS: Record<string, string> = {
     'makayasa_expenses': 'expenses',
     'makayasa_sales_deposits': 'sales_deposits',
     'makayasa_freelance_records': 'freelance_records',
     'makayasa_stok_gudang': 'stok_gudang',
     'makayasa_attendance': 'attendance' // Modul baru Anda otomatis tersinkron!
   };
   ```

2. **Gunakan `localStorage` di Komponen Baru Anda**:
   Developer tidak perlu menulis query Firestore yang rumit di komponen UI mereka. Cukup gunakan penyimpanan lokal standar:
   ```typescript
   // Untuk menyimpan data (otomatis diunggah ke cloud)
   localStorage.setItem('makayasa_attendance', JSON.stringify(daftarHadir));

   // Untuk mendengarkan pembaruan real-time dari perangkat lain
   useEffect(() => {
     const handleSync = () => {
       const dataTerbaru = localStorage.getItem('makayasa_attendance');
       // Perbarui state React Anda disini
     };
     window.addEventListener('makayasa_sync_update', handleSync);
     return () => window.removeEventListener('makayasa_sync_update', handleSync);
   }, []);
   ```

Sistem interseptor global akan menangani proses unggah, unduh, deteksi konflik, dan sinkronisasi real-time secara otomatis di latar belakang!
