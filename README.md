# KAWAI 0511 — Platform Ojek & Transportasi Lokal Banjarmasin

Selamat datang di repositori **KAWAI 0511** (Kode Wilayah 0511, Kalimantan Selatan).  
KAWAI 0511 adalah platform mobilitas dan transportasi online perkotaan yang dirancang khusus untuk karakteristik geografis dan budaya Banua Banjarmasin dan sekitarnya.

---

## 1. Persyaratan Sistem & Prasyarat

- **Node.js**: v18.0.0 atau lebih baru (direkomendasikan v20 LTS)
- **Package Manager**: `npm` v9+ atau `bun` v1.1+
- **Browser Modern**: Chrome, Firefox, Safari, atau Edge (mendukung ES2022 dan Leaflet canvas)

---

## 2. Cara Instalasi Dependensi

Repositori ini terdiri dari aplikasi web frontend (React SPA + Vite) di root dan layanan backend (NestJS) di folder `backend/`.

### Instalasi Frontend Web
```bash
# Menggunakan npm
npm install

# Atau menggunakan bun
bun install
```

### Instalasi Backend Service
```bash
cd backend
npm install
cd ..
```

---

## 3. Cara Menjalankan Aplikasi (Development)

### Menjalankan Frontend Web (Vite Dev Server)
Dev server frontend dijalankan pada port `3000`:
```bash
npm run dev
# atau
bun run dev
```
Akses aplikasi melalui peramban web di: `http://localhost:3000`

### Menjalankan Backend Service (NestJS)
```bash
cd backend
npm run start:dev
```
Backend akan berjalan pada port `3001` (atau port yang dikonfigurasi).

---

## 4. Cara Build & Pemeriksaan Kualitas Kode

### Frontend
```bash
# Typecheck / Linting
npm run lint

# Build untuk production
npm run build
```
Output hasil build statis akan disimpan di folder `dist/`.

### Backend
```bash
cd backend

# Typecheck backend
npx tsc --noEmit

# Menjalankan seluruh Acceptance Test Suites Phase 7
npx tsx test/phase7-trip-detail.spec.ts
npx tsx test/phase7-trip-history.spec.ts
npx tsx test/phase7-driver-earnings.spec.ts
npx tsx test/phase7-rating-system.spec.ts
```

---

## 5. Fitur Demo yang Tersedia

Aplikasi telah dilengkapi dengan seluruh modul interaktif fungsional:

### A. Fitur Penumpang (Customer / Passenger Mode)
- **Pemilihan Rute Banjarmasin**: Pilih titik penjemputan dan pengantaran dari berbagai landmark populer (Duta Mall, ULM Kayutangi, RSUD Ulin, Pasar Terapung Siring, Menara Pandang, Patung Bekantan, dll.).
- **Perhitungan Tarif Cerdas (Fare Engine Phase 5)**: Tarif dasar Rp 7.000, per km Rp 2.200, per menit Rp 200, batas minimum Rp 10.000.
- **Siklus Hidup Pemesanan (Order Lifecycle)**: State machine lengkap (`SEARCHING` -> `ASSIGNED` -> `ARRIVED` -> `IN_TRIP` -> `COMPLETED` / `CANCELLED`).
- **Metode Pembayaran**: Pilihan Tunai (Cash) dan Dompet Digital (KawaiPay).
- **Tombol & Modal Darurat SOS**: Panggilan cepat ke hotline darurat Banjarmasin (Polresta, RSUD, Damkar, Posko Relawan Banua).

### B. Fitur Mitra Pengemudi (Driver Mode)
- **Status Operasional**: Sakelar pergantian status `ONLINE` (siap menerima order) dan `OFFLINE` (istirahat).
- **Notifikasi Penawaran Dispatch**: Kartu order masuk dengan countdown timer 30 detik (otomatis beralih ke pengemudi lain jika waktu habis).
- **Pemantauan GPS & Status Sinyal**: Status kesegaran data lokasi Redis GEO / PostGIS (`FRESH < 10s`, akurasi ~5m).
- **Aksi Perjalanan**: Tombol interaktif untuk `TERIMA ORDER`, `TOLAK ORDER`, `TIBA DI TITIK JEMPUT`, `MULAI PERJALANAN`, dan `SELESAIKAN PERJALANAN`.
- **Kartu Pendapatan Mitra (Driver Earnings Card Phase 6C & 7.3)**: Saldo real-time berbasis Buku Besar Double-Entry (85% pendapatan mitra, 15% biaya platform).

### C. Simulasi Berdampingan (Dual Simulation Mode)
- Menampilkan antarmuka Penumpang dan Pengemudi berdampingan dalam satu layar untuk demonstrasi alur pemesanan hingga penyelesaian perjalanan secara langsung.

### D. Live Map Simulator V1 (Leaflet & OpenStreetMap)
- Peta interaktif kota Banjarmasin tanpa ketergantungan Google Maps SDK atau Google Maps API key.
- Animasi ikon motor KAWAI bergerak mulus di atas rute koordinat nyata.
- Kontrol pengguna lengkap: Mulai Simulasi, Jeda, Lanjutkan, Reset, Multiplier Kecepatan (1x, 2x, 4x), dan toggle Kamera Ikuti Kendaraan.
- Pemisahan tegas antara koordinat `SIMULATION_MODE` dan `LIVE_GPS_MODE` perangkat fisik.

### E. Integrasi API Lengkap (Phase 7.2, 7.3, 7.4, 7.5)
- **Trip History API (`GET /rides/history`)**: Riwayat perjalanan dengan otorisasi berbasis peran (`CUSTOMER` dan `DRIVER`) serta filter tab status.
- **Trip Detail API (`GET /rides/:id/detail`)**: Rincian satu perjalanan dengan proteksi anti-IDOR ketat, menggabungkan data rute, tarif, pembayaran, ulasan rating, dan audit trail waktu tanpa data palsu (*zero fake data*).
- **Rating API (`POST /rides/:id/rating`)**: Sistem penilaian timbal-balik pasca-perjalanan (bintang 1-5, tag apresiasi, dan komentar ulasan).
- **Earnings API (`GET /drivers/me/earnings` & `/drivers/me/earnings/summary`)**: Dasbor pendapatan multi-periode pengemudi (Hari Ini, Minggu Ini, Bulan Ini, Semua Waktu) yang terhubung langsung ke buku besar akuntansi.

### F. Administrasi & Pengaturan
- Menu konfigurasi developer mode dan runner simulasi acceptance test 15-tahap end-to-end.

---

## 6. Konfigurasi Environment (`.env.example`)

Salin file `.env.example` menjadi `.env` sebelum menjalankan aplikasi di server lokal Anda:
```bash
cp .env.example .env
```
Variabel penting yang perlu disesuaikan:
- `DATABASE_URL`: URL koneksi PostgreSQL PostGIS.
- `REDIS_URL`: URL koneksi Redis untuk caching lokasi geospasial.
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Kunci enkripsi token sesi (minimal 32 karakter).
- `DEV_OTP_MODE`: Set `true` untuk pengujian lokal tanpa pengiriman SMS gateway berbayar.

> **Peringatan Keamanan**: Jangan pernah menyimpan, menampilkan, atau mengunggah kredensial atau rahasia produksi asli ke repositori publik.

---

## 7. Batasan Lingkungan Demo & Catatan Produksi

1. **Payment Gateway**: Pada mode demo, transaksi KawaiPay dan Tunai disimulasikan menggunakan layer abstraksi penyedia pembayaran (`PaymentProvider`). Untuk peluncuran produksi komersial, integrasikan webhook resmi dari aggregator pembayaran berlisensi (misalnya Midtrans, Xendit, atau DOKU).
2. **OTP SMS/WhatsApp**: Mode saat ini menggunakan simulasi verifikasi OTP lokal (`DEV_OTP_MODE=true`). Produksi membutuhkan integrasi SMS/WhatsApp vendor aggregator aktif.
3. **Penyedia Peta (OpenStreetMap)**: Tile peta OpenStreetMap pada simulator ditujukan untuk pengujian dan evaluasi fungsional sesuai kebijakan penggunaan wajar (*fair-use policy*). Untuk skala produksi tinggi, disarankan menggunakan CDN tile khusus atau tile server mandiri.
4. **Pelacakan Geospasial Fisik**: Koordinat simulator merupakan titik uji coba kota Banjarmasin. Fitur "Gunakan Lokasi Saya" memanfaatkan Geolocation API browser dan hanya aktif atas izin pengguna.
5. **Database Ledger**: Skema akuntansi double-entry menjamin `SUM(debit) = SUM(credit)`. Pada server produksi, pastikan PostgreSQL dijalankan dengan konfigurasi replikasi dan backup berkala.

---

## 8. Lisensi

Hak Cipta © 2026 KAWAI 0511 Banjarmasin. Seluruh hak dilindungi undang-undang.
