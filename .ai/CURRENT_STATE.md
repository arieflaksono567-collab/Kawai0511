# KAWAI 0511 — Current State

> Status Terkini: **Phase 7.5 Single Trip Detail Complete & Validated** (Multi-Role Authorization, IDOR Protection, Real Composite Data Merging, Explicit Nullable/Unavailable States, Zero Fake Data)  
> Terakhir diperbarui: 2026-10-12

---

## 1. Ringkasan Status Proyek

| Fase | Nama Modul | Status | Keterangan |
|---|---|---|---|
| **Phase 1** | Foundation & Project Setup | **FROZEN** | Monorepo structure, Docker PostGIS, Redis. |
| **Phase 2** | Auth & Identity | **FROZEN** | Nomor HP E.164 (+62), OTP abstraction, JWT, RBAC (`CUSTOMER`, `DRIVER`, `ADMIN`). |
| **Phase 3** | Driver Onboarding & KYC | **FROZEN** | 4 Berkas KYC, kendaraan, status ONLINE/OFFLINE, admin verification. |
| **Phase 4** | Location & Geospatial Engine | **FROZEN** | Redis GEO, PostGIS fallback, Haversine, freshness (FRESH/STALE/EXPIRED). |
| **Phase 5A**| Ride Ordering & Fare Engine | **FROZEN** | Fare engine Banjarmasin, order lifecycle state machine, audit logs. |
| **Phase 5B**| Driver Matching & Dispatch | **FROZEN** | Radius 1500m, ranking deterministik, timeout 30s, atomic concurrency lock. |
| **Phase 6A**| Payment & Double-Entry Ledger | **FROZEN** | Tabel payments, ledger accounts, transactions, entries, split config. |
| **Phase 6B**| Payment Service & Webhook Security | **FROZEN** | Cash & Digital mock provider, HMAC-SHA256, replay protection, mutex lock. |
| **Phase 6C**| Settlement & Driver Earnings | **FROZEN** | 8-step atomic settlement, ledger-authoritative driver earnings. |
| **Phase 7.1**| Database Foundation (Rating, Earnings, History) | **FROZEN** | Skema tabel `ride_ratings`, `driver_earnings_ledger`, composite indexes, view `view_trip_history_details`, repository & authorization scoping. |
| **Phase 7.2**| Rating System (Passenger & Driver) | **FROZEN** | Endpoint `POST /rides/:id/rating` & `POST /ratings`, validasi status COMPLETED, proteksi double rating, self-rating rejection, driver rating aggregation. |
| **Phase 7.3**| Driver Earnings Ledger & Dashboard Engine | **FROZEN** | Driver Earnings Ledger berbasis single source of truth, validasi status COMPLETED, proteksi duplikasi earning, penanganan idempoten webhook retry, otorisasi driver, kueri agregasi (hari ini, minggu ini, bulan ini, all-time). |
| **Phase 7.4**| Passenger & Driver Trip History | **FROZEN** | Multi-role trip history engine, isolasi data penumpang dan driver, paginasi komprehensif, pengurutan terbaru lebih dulu (newest first), proteksi anti-bocor kredensial/rahasia, DTO & safe user summaries. |
| **Phase 7.5**| Single Trip Detail (Endpoint & Service) | **FROZEN** | Detail satu perjalanan dengan otorisasi ketat, proteksi IDOR, penggabungan data riil (ride, pickup, destination, route/distance, fare, payment, rating, status, timestamps, driver/passenger summary), explicit nullable/unavailable states (zero fake data). |
| **Simulator**| Live Map Simulator V1 (Leaflet & OSM) | **COMPLETE / VALIDATED** | Peta interaktif Banjarmasin via Leaflet & OpenStreetMap (zero Google Maps SDK), animasi motor bergerak mengikuti koordinat rute, kontrol Play/Pause/Resume/Reset, multiplier kecepatan 1x/2x/4x, kamera ikuti kendaraan, pemisahan tegas Live GPS fisik, dan penanganan kegagalan tile. |

---

## 2. Pencapaian Phase 7.5 (Single Trip Detail & Anti-IDOR Engine)

1. **Otorisasi Multi-Peran & Proteksi Anti-IDOR (*Strict IDOR Defense*)**:
   - **Passenger Isolation**: Penumpang hanya dapat membuka detail perjalanan miliknya (`ride.passengerId === currentUser.id`). Upaya mengakses perjalanan milik penumpang lain diblokir dengan `ForbiddenException` (HTTP 403). Buku besar pendapatan mitra (`earnings`) disembunyikan secara mutlak dari penumpang.
   - **Driver Isolation**: Pengemudi hanya dapat membuka detail perjalanan yang ditugaskan kepadanya (`ride.driverId === currentUser.driverId || ride.driverId === currentUser.id`). Upaya mengakses perjalanan armada lain atau perjalanan yang belum ditugaskan (status `SEARCHING`) diblokir dengan `ForbiddenException` (HTTP 403). Pengemudi dapat melihat catatan pendapatannya sendiri.
   - **Admin Access**: Admin memiliki hak audit penuh untuk membuka detail perjalanan mana pun.
   - **Unauthenticated Protection**: Permintaan tanpa konteks pengguna ditolak dengan `UnauthorizedException` (HTTP 401).

2. **Penggabungan Data Nyata Tanpa Data Palsu (*Zero Fake Data Principle*)**:
   - **Ride Core**: `id`, `rideId`, `status`, `rideStatus`, `passengerId`, `driverId`, `cancellationReason`.
   - **Pickup & Destination**: Objek koordinat dan alamat lengkap `{ address, lat, lng }`.
   - **Route & Distance**: `distanceKm`, `durationMinutes`, dan `route` (polyline/geometry riil jika tersedia; jika belum tersedia, strictly `null` tanpa mengarang rute palsu).
   - **Fare Breakdown**: Rincian tarif lengkap (`totalFare`, `baseFare`, `distanceFare`, `durationFare`, `perKmRate`, `perMinuteRate`, `minimumFare`).
   - **Payment**: Menggabungkan data pembayaran nyata dari `PaymentService` (`method`, `status`, `amount`, `isSettled`, `paidAt`). Jika perjalanan belum dibayar (misal `SEARCHING`), `payment` bernilai `null` tanpa mengarang transaksi tunai palsu.
   - **Rating**: Menggabungkan ulasan riil dari `RatingRepository`. Jika perjalanan belum diberi rating, field bernilai `null` tanpa mengarang rating 5.0 atau 4.9.
   - **Timestamps**: Objek `timestamps` komprehensif (`createdAt`, `assignedAt`, `arrivedAt`, `startedAt`, `completedAt`, `cancelledAt`, `updatedAt`). Status lifecycle yang belum tercapai bernilai `null` tanpa mengarang waktu palsu.
   - **Safe User Summaries**: 
     - `passenger`: `{ id, fullName, phoneNumber (termasker: +62812****0987), avatarUrl }`.
     - `driver`: `{ id, name, phone (termasker), vehiclePlate, vehicleModel, rating (riil atau null jika belum ada), avatarUrl }`. Jika belum ditugaskan driver, `driver` bernilai `null`.

3. **Endpoints & Arsitektur Service**:
   - `TripDetailService` (`backend/src/ride/trip-detail.service.ts`): Layanan tunggal dengan penggabungan multi-sistem terotorisasi.
   - `GET /rides/:id/detail`: Endpoint REST eksplisit untuk detail satu perjalanan dengan proteksi IDOR.
   - `GET /rides/history/:id`: Kompatibel penuh dengan spesifikasi Phase 7.4.

4. **Hasil Test Suite Otomatis**:
   - `backend/test/phase7-trip-detail.spec.ts`: **10 / 10 Tests PASSED (100%)**
     - `TEST 1: Passenger authorization & IDOR (hanya membuka miliknya, cross-passenger rejected 403)` - PASSED
     - `TEST 2: Driver authorization & IDOR (hanya membuka yang ditugaskan, cross-driver rejected 403)` - PASSED
     - `TEST 3: Driver unassigned trip rejection (menolak akses driver ke order belum ditugaskan 403)` - PASSED
     - `TEST 4: Unauthenticated access rejection (401 jika konteks user kosong)` - PASSED
     - `TEST 5: Non-existent trip handling (404 jika ID tidak ditemukan)` - PASSED
     - `TEST 6: Admin audit capability (admin dapat mengaudit detail trip)` - PASSED
     - `TEST 7: Composite data aggregation (penggabungan ride, pickup, destination, fare, payment, rating, timestamps, summaries)` - PASSED
     - `TEST 8: Zero fake data enforcement (unrated -> rating: null, unpaid -> payment: null, unassigned -> driver: null, unreached -> timestamps: null)` - PASSED
     - `TEST 9: Sensitive data isolation (anti-bocor kredensial & sembunyikan earnings dari penumpang)` - PASSED
     - `TEST 10: Controller integration & IDOR protection (GET /rides/:id/detail & GET /rides/history/:id)` - PASSED
   - `backend/test/phase7-trip-history.spec.ts`: **10 / 10 Tests PASSED (100%)**
   - `backend/test/phase7-driver-earnings.spec.ts`: **10 / 10 Tests PASSED (100%)**
   - `backend/test/phase7-rating-system.spec.ts`: **10 / 10 Tests PASSED (100%)**
   - `backend/test/phase7-database-foundation.spec.ts`: **10 / 10 Tests PASSED (100%)**
   - `backend/test/run-phase5-tests.ts`: **20 / 20 Tests PASSED (100%)**
   - `backend/test/phase6c-settlement-earnings.spec.ts`: **10 / 10 Tests PASSED (100%)**
   - Backend Typecheck (`cd backend && npx tsc --noEmit`): **0 errors**.
   - Frontend Linter (`npm run lint`): **0 errors**.
   - Frontend Applet Compilation (`compile_applet`): **Succeeded**.

---

## 3. Boundary & Panduan Langkah Selanjutnya
- Scope Phase 7.5 tuntas dan tervalidasi penuh.
- UI tidak diubah sesuai instruksi (*Jangan mengubah desain UI*).
- Seluruh modul Phase 7 (7.1 Database Foundation, 7.2 Rating System, 7.3 Driver Earnings Ledger, 7.4 Trip History, dan 7.5 Single Trip Detail) beroperasi harmonis dengan standar zero data leakage dan anti-IDOR.
