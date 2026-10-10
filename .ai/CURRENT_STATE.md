# KAWAI 0511 — Current State

> Status Terkini: **Phase 7.3 Complete & Validated** (Driver Earnings Ledger: Settlement, Idempotency, Authorization & Multi-Period Dashboard)  
> Terakhir diperbarui: 2026-10-10

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
| **Phase 7.3**| Driver Earnings Ledger & Dashboard Engine | **COMPLETE / VALIDATED** | Driver Earnings Ledger berbasis single source of truth, validasi status COMPLETED, proteksi duplikasi earning, penanganan idempoten webhook retry, otorisasi driver, kueri agregasi (hari ini, minggu ini, bulan ini, all-time). |
| **Phase 7.4**| Historical Trips & Multi-Role History API | *NEXT* | Composite view pagination, multi-role trip history filtering, receipt breakdown. |

---

## 2. Pencapaian Phase 7.3 (Driver Earnings Ledger)

1. **Database Ledger Sebagai Sumber Kebenaran Tunggal (*Single Source of Truth*)**:
   - Nilai pendapatan dihitung dan dibukukan secara eksklusif dari data `Ride` dan `Payment` yang tervalidasi pada backend.
   - Aplikasi klien tidak dapat memanipulasi atau mengirim angka pendapatan sendiri.

2. **Aturan Integritas & Validasi Bisnis (*Strict Business Rules*)**:
   - **Rule 1 (Status COMPLETED Only)**: Perjalanan yang belum `COMPLETED` (`SEARCHING`, `ASSIGNED`, `IN_TRIP`) atau berstatus `CANCELLED` ditolak keras dari pembukuan pendapatan final (`BadRequestException`).
   - **Rule 2 (Anti-Duplikasi Earning)**: Satu perjalanan tidak dapat dibukukan berulang kali ke buku besar pendapatan mitra (`ConflictException` HTTP 409).
   - **Rule 3 & 4 (Idempotensi Webhook & Callback Retry)**: Callback atau retry webhook pembayaran yang dipanggil berulang kali menghasilkan respon idempoten tanpa membuat duplikasi entri kredit.
   - **Rule 5 (Presisi Matematika Finansial)**: Seluruh perhitungan pendapatan menggunakan arithmetic bilangan bulat Rupiah (IDR) presisi, menegakkan `net_amount + platform_fee === gross_amount` tanpa kebocoran sen/rupiah pembulatan.
   - **Rule 6 (Otorisasi Akses Driver)**: Hak akses pendapatan terikat secara ketat pada identitas terotentikasi driver (`req.user`); akses oleh driver lain atau penumpang ditolak (`ForbiddenException` HTTP 403), sedangkan Admin memiliki akses audit penuh.

3. **Dashboard & Kueri Agregasi Multi-Periode**:
   - Mendukung filter periode: `hari ini` (`today`), `minggu ini` (`week`), `bulan ini` (`month`), dan `semua` (`all-time`).
   - Mengembalikan metrik komprehensif: `totalTrips` (total perjalanan), `totalGross` (total kotor), `totalFee` (total komisi platform), `totalNet` (total pendapatan bersih driver), `ledgerBalance` (saldo resmi dari Double-Entry Ledger), dan daftar rincian item transaksi (`items`).
   - Endpoint ringkasan multi-periode `GET /drivers/me/earnings/summary` mengembalikan kartu performa Hari Ini, Minggu Ini, Bulan Ini, dan All-Time dalam satu request.

4. **Arsitektur API & Endpoints**:
   - `GET /drivers/me/earnings?period=today|week|month|all-time`: Kueri dashboard pendapatan driver terotentikasi.
   - `GET /drivers/me/earnings/summary`: Ringkasan multi-periode pendapatan mitra driver.
   - `GET /admin/drivers/:id/earnings`: Kueri audit pendapatan driver oleh Admin.
   - `GET /admin/drivers/:id/earnings/summary`: Ringkasan audit pendapatan driver oleh Admin.
   - `GET /payments/driver-earnings/:driverId`: Akses langsung layanan keuangan pendapatan.
   - `GET /payments/driver-earnings/:driverId/summary`: Ringkasan langsung layanan keuangan pendapatan.

5. **Hasil Test Suite Otomatis**:
   - `backend/test/phase7-driver-earnings.spec.ts`: **10 / 10 Tests PASSED (100%)**
     - `TEST 1: Completed Ride recording & ledger sync` - PASSED
     - `TEST 2: Cancelled & In-Progress Ride rejection (Rule 1)` - PASSED
     - `TEST 3: Duplicate Earning rejection (Rule 2)` - PASSED
     - `TEST 4: Payment Callback & Retry idempotency (Rule 3 & 4)` - PASSED
     - `TEST 5: Driver Authorization scoping (Rule 6)` - PASSED
     - `TEST 6: Date Aggregation (Hari Ini / Today)` - PASSED
     - `TEST 7: Date Aggregation (Minggu Ini / Week)` - PASSED
     - `TEST 8: Date Aggregation (Bulan Ini / Month)` - PASSED
     - `TEST 9: All-Time Aggregation & Single Source of Truth` - PASSED
     - `TEST 10: Multi-Period Summary card output` - PASSED
   - `backend/test/phase7-rating-system.spec.ts`: **10 / 10 Tests PASSED (100%)**
   - `backend/test/phase7-database-foundation.spec.ts`: **10 / 10 Tests PASSED (100%)**
   - `backend/test/phase6c-settlement-earnings.spec.ts`: **10 / 10 Tests PASSED (100%)**
   - `backend/test/run-phase5-tests.ts`: **20 / 20 Tests PASSED (100%)**
   - Backend Typecheck (`cd backend && npx tsc --noEmit`): **0 errors**.
   - Frontend Linter (`npm run lint`): **0 errors**.
   - Frontend Build (`vite build`): **Succeeded**.

---

## 3. Boundary & Panduan Langkah Selanjutnya
- Scope Phase 7.3 selesai dan tervalidasi penuh.
- UI Driver tidak diubah pada tahap ini (sesuai instruksi *Jangan mengubah UI driver dulu*).
- Siap melanjutkan ke Phase 7.4 (Trip History API & Composite Views) sesuai arahan pengguna.
