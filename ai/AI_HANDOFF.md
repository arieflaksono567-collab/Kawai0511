# KAWAI 0511 — AI Handoff Document

> **Dokumen Transisi & Konteks AI (Updated: Phase 4 Complete)**  
> Dokumen ini mencatat kondisi arsitektur, implementasi nyata, dependensi, dan batasan teknis saat ini pada repository KAWAI 0511.

---

## 1. Identitas Proyek & Konteks Regional
- **Nama Platform**: KAWAI 0511 (Aplikasi Super-App Transportasi, Pengantaran, dan Logistik Lokal)
- **Wilayah Operasional**: Kota Banjarmasin, Kalimantan Selatan (Kode Wilayah: 0511)
- **Arsitektur**: Monorepo terstruktur (Backend NestJS + Frontend Web Cockpit Tailwind React + Flutter App Stubs)
- **Basis Data Target**: PostgreSQL 16 + PostGIS (Spasial) + Redis (Cache Spasial/PubSub)

---

## 2. Status Implementasi Aktual (Kondisi Repository Riil)

### A. PHASE 1 — Project Foundation [FROZEN]
- Monorepo folder layout (`apps/`, `backend/`, `database/`, `ai/`, `phases/`).
- Docker Compose configuration (`docker-compose.yml`) dengan PostGIS dan Redis.
- Skema dasar basis data (`001_initial_foundation.sql`).

### B. PHASE 2 — Authentication & User System [FROZEN]
- Normalisasi nomor telepon format Indonesia E.164 (`+62xxxxxxxxxxx`) via `phone.util.ts`.
- Layanan OTP aman dengan batasan percobaan 5x, masa berlaku 5 menit, dan cooldown 60 detik.
- Dual token: JWT Access Token (15 menit) + Refresh Token Rotation (30 hari).
- Role-Based Access Control (RBAC) terpusat: `CUSTOMER`, `DRIVER`, `ADMIN`.
- Endpoints: `POST /auth/request-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`, `POST /auth/logout`, `GET /users/me`, `PATCH /users/me`, `POST /auth/admin/login`.
- 12/12 Acceptance tests terverifikasi.

### C. PHASE 3 — Driver System & KYC Verification [FROZEN]
- Pemisahan identitas pengguna (`users.id`) dengan profil pengemudi (`drivers.id`).
- Manajemen dokumen KYC bermasker: KTP, SIM C, STNK, dan SKCK via `LocalDocumentStorageProvider`.
- Pendaftaran kendaraan motor dengan normalisasi plat nomor (contoh: `DA 5110 KAW`).
- `DriverEligibilityService`: Memastikan hanya driver berstatus `APPROVED` dengan 4 berkas sah dan kendaraan valid yang diizinkan berstatus operasional `ONLINE`.
- Antrean verifikasi admin dan audit log pencatatan aksi.
- 20/20 Acceptance tests terverifikasi.

### D. PHASE 4 — Maps & Location System [FROZEN / COMPLETED]
- **PostgreSQL 16 + PostGIS**: Tabel `driver_locations` dengan tipe data native `GEOGRAPHY(POINT, 4326)` dan spatial GiST index (`004_maps_and_location.sql`).
- **Driver GPS Broadcast**: Endpoint `POST /drivers/me/location` dengan validasi bounds fisik, proteksi paket out-of-order, dan rate limiting (maksimal 60 update/menit).
- **Location Freshness Engine**:
  - `FRESH` (< 10 detik): Siap menerima order di Phase 5.
  - `STALE` (10 - 30 detik): Butuh pembaruan heartbeat lokasi.
  - `EXPIRED` (> 30 detik): Otomatis didiskualifikasi dari pencarian armada terdekat.
- **Redis GEO**: Simulasi cache spasial berkinerja tinggi (`GEOADD`, `GEOSEARCH`) dalam radius 1.5 km Kota Banjarmasin dengan fallback otomatis ke PostGIS saat Redis offline.
- **Geocoding & POI Banjarmasin**: Resolusi alamat koordinat dan pencarian landmark kunci (Duta Mall, Menara Pandang Siring Martapura, RSUD Ulin, ULM Kayu Tangi, Pelabuhan Trisakti, Masjid Sabilal Muhtadin, Terminal Km 6).
- **Routing Engine Abstraction**: Perhitungan jarak tempuh meter/km dan durasi menit via `GET /locations/route` dengan **Strict Zero-Fare Rule** (tanpa logika tarif).
- 15/15 Acceptance tests terverifikasi.

---

## 3. Berkas-Berkas Kunci Aktual

| Komponen | Jalur Berkas (*File Path*) | Fungsi / Deskripsi |
|---|---|---|
| **Database Migrations** | `/database/migrations/004_maps_and_location.sql` | Skema PostGIS `driver_locations`, trigger geometri, tabel landmark |
| **Location Service** | `/backend/src/location/location.service.ts` | Validasi fisik GPS, rate limiting, penanganan out-of-order |
| **Location Freshness** | `/backend/src/location/location-freshness.service.ts` | Evaluasi kesegaran GPS (<10s FRESH, 10-30s STALE, >30s EXPIRED) |
| **Redis GEO Cache** | `/backend/src/location/redis-geo.service.ts` | Operasi GEOADD & GEOSEARCH dengan mekanisme fallback resilience |
| **Geocoding Engine** | `/backend/src/location/geocoding.service.ts` | Reverse geocoding dan registry landmark Banjarmasin (0511) |
| **Routing Abstraction** | `/backend/src/location/routing.service.ts` | Kalkulasi jarak jalan dan durasi motor (strictly zero-fare) |
| **Location Controller** | `/backend/src/location/location.controller.ts` | Endpoint NestJS terproteksi JWT & RBAC untuk fitur lokasi |
| **Dev API Middleware** | `/vite.config.ts` | Mock runtime middleware port 3000 untuk simulasi browser/curl |
| **Interactive Cockpit** | `/src/App.tsx` | UI konsol Peta Banjarmasin, Radar Armada, GPS Streamer, & Test Runner |
| **Acceptance Tests** | `/backend/test/phase4-acceptance.spec.ts` | Test suite 15 skenario pengujian infrastruktur Phase 4 |

---

## 4. Endpoints API yang Tersedia & Aktif

### Location & Geospatial API
- `POST /drivers/me/location` : Mengirim koordinat GPS terbaru pengemudi.
- `GET /drivers/me/location` : Mengambil posisi terkini pengemudi beserta status kesegarannya.
- `GET /drivers/me/location/status` : Memeriksa kesegaran GPS dan kelayakan operasional (`isOperationallyAvailable`).
- `GET /locations/nearby-drivers?lat=...&lng=...&radius=1500` : Mencari armada aktif terdekat dalam radius meter (memfilter armada EXPIRED).
- `GET /locations/reverse-geocode?lat=...&lng=...` : Menerjemahkan koordinat lat/lng menjadi alamat hierarki Kota Banjarmasin.
- `GET /locations/search?q=...` : Pencarian landmark/POI Banjarmasin.
- `GET /locations/route?originLat=...&originLng=...&destLat=...&destLng=...` : Kalkulasi jarak & durasi rute (Zero-Fare).
- `GET /admin/drivers/locations` : Monitoring seluruh lokasi armada operasional untuk admin.
- `GET /health` : Status kesehatan sistem (`PHASE 4 - MAPS & LOCATION`).

---

## 5. Hasil Pengujian (*Test Results*)
- **Phase 4 Acceptance Test Suite**: **15 / 15 PASSED (100%)**
  1. PostGIS Schema & Point Geography (4326) GiST index
  2. Driver GPS updates via `POST /drivers/me/location`
  3. Physical bounds validation (Latitude & Longitude)
  4. Negative physics parameter rejection (Accuracy & Heading)
  5. Out-of-order timestamp protection
  6. GPS stream rate limiting (60 req/min)
  7. Freshness category FRESH (< 10s)
  8. Freshness category STALE (10 - 30s)
  9. Freshness category EXPIRED (> 30s) disqualification
  10. Redis GEO search dalam radius 1500m
  11. Graceful degradation fallback saat Redis down
  12. Reverse geocoding landmark Banjarmasin
  13. Autocomplete landmark POI search
  14. Routing abstraction distance & duration (Zero-Fare)
  15. RBAC isolation untuk stream GPS driver
- **TypeScript Static Check**: `tsc --noEmit` lulus dengan 0 error.
- **Production Bundle Build**: `vite build` lulus dengan 0 error.

---

## 6. Batasan Teknis & Utang Teknis (*Known Issues & Technical Debt*)
1. **In-Memory Store pada Dev Runtime (`vite.config.ts`)**: Server dev Vite menggunakan Map in-memory untuk menyimulasikan Redis GEO dan PostgreSQL karena batasan preview web container tanpa daemon service background. Untuk pengujian produksi, instance PostgreSQL PostGIS dan Redis harus dijalankan melalui `docker-compose up -d`.
2. **Koleksi Landmark Statis**: Daftar POI/Landmark Banjarmasin saat ini masih didefinisikan secara statis di dalam `GeocodingService` dan seed migration, belum memiliki panel admin CRUD dinamis.
3. **Kalkulasi Rute Heuristik**: Kalkulasi jarak jalan raya saat ini mengombinasikan rumus Haversine geodesik dengan koefisien jaringan jalan raya perkotaan Banjarmasin ($1.25\times$), belum terintegrasi dengan server OSRM atau Google Maps API eksternal.
4. **Isolasi Monorepo `backend/`**: Kompilasi backend memanfaatkan pustaka TypeScript monorepo root. Skrip `backend/tsconfig.json` telah diperbaiki agar kompatibel dengan TypeScript 7 (`baseUrl` digantikan oleh mapping `paths`).

---

## 7. Fitur yang BELUM Diimplementasikan (Di Luar Cakupan Phase 4)
Fitur-fitur berikut ini secara sengaja **DIBEKUKAN** dan belum boleh dibangun hingga fase terkait dimulai:
- **Phase 5 (Ride Ordering & Dispatch)**:
  - Pembuatan order ride penumpang (`POST /rides/order`)
  - Mesin kalkulasi tarif (*Fare Engine*: batas minimum Rp 10.000, rute per-km, per-menit, surge multiplier)
  - Algoritma pencocokan pengemudi (*Driver Matching*) dengan radius bertingkat
  - State machine transisi order (`SEARCHING` -> `ASSIGNED` -> `ARRIVED` -> `IN_TRIP` -> `COMPLETED`)
- **Phase 6 (Payment & Wallet)**: E-wallet KawaiPay, top up saldo, split bagi hasil 85% driver / 15% platform, integrasi QRIS / Payment Gateway.
- **Phase 7 (Food & Delivery)**: Pesan antar makanan kuliner Banjar (Soto Banjar, Ketupat Kandangan) dan ekspedisi logistik instan (Kawai Send).
- **Phase 8 (Chat & Notifications)**: Obrolan real-time via WebSocket dan push notifications (FCM).
- **Phase 9 (Admin Dashboard)**: Panel pemantauan komprehensif, konfigurasi tarif global, penanganan darurat SOS.
- **Phase 10 (Testing & Hardening)**: Anti-fraud fake GPS teleportation detector, stress test konkurensi tinggi.

---

## 8. Panduan untuk AI Berikutnya (*Instruction for Next AI Step*)
- Status proyek saat ini adalah **STOPPED** pada Phase 4.
- Jangan mengulang atau membongkar Phase 1, Phase 2, Phase 3, atau Phase 4.
- Jika pengguna meminta melanjutkan ke **PHASE 5 (RIDE ORDERING & DISPATCH)**:
  - Bangun lifecycle pemesanan perjalanan menggunakan infrastruktur lokasi yang telah disediakan di Phase 4.
  - Gunakan `LocationFreshnessService`: Hanya driver dengan status `FRESH` yang boleh menerima penawaran order.
  - Terapkan kalkulasi tarif resmi KAWAI 0511 (Tarif dasar Rp 7.000, Rp 2.200/km, Rp 200/menit, tarif minimum Rp 10.000).
