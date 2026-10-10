# KAWAI 0511 — Changelog

Semua perubahan pada repositori KAWAI 0511 dicatat secara kronologis berdasarkan implementasi aktual.

---

## [Phase 7.3] - 2026-10-10
### Added
- **Driver Earnings Ledger Service & Integration (`backend/src/payment/driver-earnings.service.ts`)**:
  - Implementasi sistem pencatatan pendapatan mitra pengemudi berbasis Database Ledger sebagai *single source of truth*.
  - Menghindari manipulasi nilai pendapatan dari sisi klien driver; pendapatan dikalkulasi secara eksklusif dari data `Ride` (status COMPLETED) dan `Payment` (PAID & Settled).
  - Pencatatan lengkap: `gross_amount` (gross fare), `platform_fee` (komisi platform 15%), `net_amount` (pendapatan bersih driver 85%), `tip_amount`, `currency: 'IDR'`, `status: 'SETTLED'`, relasi ke `Ride`, dan audit timestamp terstandarisasi.
  - **Rule 1 (Status COMPLETED Only)**: Perjalanan yang belum `COMPLETED` (berstatus `SEARCHING`, `ASSIGNED`, `IN_TRIP`) atau dibatalkan (`CANCELLED`) ditolak keras dari pembuatan pendapatan final (`BadRequestException`).
  - **Rule 2 & 3 (Anti-Duplicate & Idempotency)**:
    - Satu perjalanan tidak dapat menghasilkan catatan pendapatan ganda di buku besar (`ConflictException` HTTP 409).
    - Callback / webhook retry pembayaran ditangani secara idempoten: mengembalikan entri buku besar yang sudah ada tanpa menduplikasi kredit saldo.
  - **Rule 4 & 5 (Numeric Financial Precision)**: Menggunakan integer/numeric arithmetic dalam Rupiah IDR presisi tanpa kebocoran floating point (`net_amount + platform_fee === gross_amount`).
  - **Rule 6 (Strict Driver Authorization)**: Otorisasi berbasis identitas JWT terotentikasi; driver hanya dapat mengakses data pendapatannya sendiri, driver lain atau customer ditolak (`ForbiddenException` HTTP 403), sedangkan Admin memiliki akses pengawasan penuh.
- **Dashboard & Query Agregasi Multi-Periode (`backend/src/payment/driver-earnings-ledger.repository.ts`)**:
  - Mendukung kueri periode: `hari ini` (`today`), `minggu ini` (`week`), `bulan ini` (`month`), dan `semua` (`all-time`).
  - Menghitung metrik akurat: `totalTrips` (total perjalanan), `totalGross`, `totalFee` (total komisi platform), `totalNet` (total pendapatan bersih driver), `ledgerBalance`, dan daftar rincian perjalanan (`items`).
  - Endpoint `GET /drivers/me/earnings`: Kueri dashboard dengan parameter periode.
  - Endpoint `GET /drivers/me/earnings/summary`: Ringkasan multi-periode (hari ini, minggu ini, bulan ini, all-time) dalam satu panggilan API.
  - Endpoint Admin: `GET /admin/drivers/:id/earnings` dan `GET /admin/drivers/:id/earnings/summary`.
  - Endpoint Pembayaran: `GET /payments/driver-earnings/:driverId` dan `GET /payments/driver-earnings/:driverId/summary`.
- **Modul & Dependensi Terhubung**:
  - `PaymentModule` mendaftarkan dan mengekspor `DriverEarningsService` serta `DriverEarningsLedgerRepository`.
  - `DriverModule` menghubungkan `DriverService` ke `DriverEarningsService`.
  - `PaymentService` melakukan sinkronisasi idempoten otomatis ke `DriverEarningsService` saat penyelesaian pembayaran (`settlePaymentRecord`).
- **Automated Acceptance Test Suite (`backend/test/phase7-driver-earnings.spec.ts`)**:
  - 10 skenario pengujian komprehensif (100% Passed):
    1. Completed Ride: Pencatatan akurat gross fare, fee 15%, net 85%, dan sinkronisasi saldo buku besar.
    2. Cancelled & In-Progress Ride: Penolakan ride berstatus CANCELLED, SEARCHING, dan IN_TRIP (Rule 1).
    3. Duplicate Earning: Penolakan rekaman earning ganda untuk ride yang sama dengan HTTP 409 Conflict (Rule 2).
    4. Payment Callback & Retry: Penanganan idempoten mencegah duplikasi kredit pendapatan saat webhook retry (Rule 3 & 4).
    5. Driver Authorization: Akses terisolasi untuk driver pemilik atau admin, memblokir driver lain dan customer (Rule 6).
    6. Date Aggregation (Hari Ini / Today): Validasi perhitungan totalTrips, totalGross, totalFee, totalNet untuk hari ini.
    7. Date Aggregation (Minggu Ini / Week): Validasi agregasi perjalanan 7 hari terakhir.
    8. Date Aggregation (Bulan Ini / Month): Validasi agregasi perjalanan bulan kalender berjalan.
    9. All-Time Aggregation: Validasi saldo buku besar Double-Entry Ledger sebagai sumber kebenaran mutlak.
    10. Multi-Period Summary: Validasi respon kartu ringkasan dashboard terpadu.

---

## [Phase 7.2] - 2026-10-10
### Added
- **Rating System Service & Endpoints (`backend/src/rating/rating.service.ts` & `backend/src/rating/rating.controller.ts`)**:
  - Dukungan dua arah penilaian pasca-perjalanan: Passenger $\rightarrow$ Driver dan Driver $\rightarrow$ Passenger.
  - Validasi skor ketat 1–5 (angka/integer non-negatif dan non-NaN).
  - Validasi status order: HANYA perjalanan berstatus `COMPLETED` yang diizinkan untuk dinilai; status lainnya (`SEARCHING`, `ASSIGNED`, `ARRIVED`, `IN_TRIP`, `CANCELLED`) ditolak keras (`BadRequestException`).
  - Proteksi otorisasi hubungan perjalanan: Hanya penumpang atau driver yang terkait dengan perjalanan tersebut yang dapat memberikan penilaian; pihak ketiga ditolak (`ForbiddenException` HTTP 403).
  - Proteksi rating ganda backend: Satu reviewer hanya dapat memberikan satu kali penilaian untuk satu perjalanan (`ConflictException` HTTP 409).
  - Proteksi self-rating: Menolak keras pengguna yang mencoba menilai dirinya sendiri (`BadRequestException` HTTP 400).
  - Validasi identitas aman: Reviewer dan reviewed user divalidasi langsung dari token JWT terautentikasi dan entitas `Ride`, bukan dari payload yang dikirim klien (mencegah identity spoofing).
  - Zero state machine mutation: Status perjalanan `COMPLETED` tetap utuh dan terkunci.
  - Endpoints: `POST /rides/:id/rating`, `POST /ratings`, `GET /rides/:id/ratings`, `GET /ratings/driver/:driverId/summary`, `GET /ratings/driver/:driverId`, `GET /ratings/me`.
- **Driver Rating Aggregation Engine (`backend/src/driver/driver.service.ts`)**:
  - Metode `updateDriverRatingAggregation(driverId, score)` menghitung rata-rata bintang baru (`ratingAverage`) dan akumulasi ulasan (`ratingCount`) secara otomatis saat penumpang menilai driver.
  - Sinkronisasi snapshot rating pada armada driver.
- **DTO & Module Integration**:
  - `backend/src/rating/dto/create-rating.dto.ts`.
  - `backend/src/rating/rating.module.ts` terdaftar pada `backend/src/app.module.ts`.
- **Automated Acceptance Test Suite (`backend/test/phase7-rating-system.spec.ts`)**:
  - 10 skenario pengujian komprehensif mencakup seluruh 7 kriteria wajib (valid passenger rating, valid driver rating, invalid score, rating sebelum COMPLETED, unauthorized user rejection, duplicate rating rejection, self-rating rejection) ditambah agregasi rating driver, anti-spoofing identity check, dan hak akses kueri ulasan (100% Passed).

---

## [Phase 7.1] - 2026-10-10
### Added
- **Database Foundation: Rating, Earnings Ledger & Trip History (`database/migrations/010_rating_earnings_history.sql`)**:
  - **Tabel `ride_ratings`**:
    - Relasi referensial penuh ke `rides(id)`, `users(id)` (reviewer & reviewed user), dan `drivers(id)`.
    - Batasan nilai `score` dari 1.0 sampai 5.0 (`CHECK (score >= 1.0 AND score <= 5.0)`).
    - Kolom ulasan tekstual opsional `comment TEXT`, array tag kategori feedback `tags VARCHAR(64)[]`, dan `tip_amount NUMERIC(12, 2)`.
    - Proteksi integritas unik: `CONSTRAINT uq_ride_reviewer UNIQUE (ride_id, reviewer_id)` untuk mencegah rating ganda pada perjalanan yang sama.
    - Proteksi self-review: `CONSTRAINT check_distinct_reviewer CHECK (reviewer_id <> reviewed_user_id)`.
    - Indeks pencarian: `idx_ratings_ride`, `idx_ratings_reviewer`, `idx_ratings_reviewed_user`, `idx_ratings_driver`, `idx_ratings_created_at`, `idx_ratings_score`.
  - **Tabel `driver_earnings_ledger`**:
    - Pencatatan pendapatan per perjalanan: `driver_id`, `ride_id`, `payment_id`, `gross_amount`, `platform_fee`, `net_amount`, `tip_amount`, `currency: 'IDR'`, `status`.
    - Presisi moneter mutlak menggunakan `NUMERIC(12, 2)` (menghindari error floating-point).
    - Integritas pembagian komisi: `CONSTRAINT check_earnings_math_balance CHECK (net_amount + platform_fee = gross_amount)`.
    - Proteksi duplikasi entri pendapatan per trip: `CONSTRAINT uq_driver_ride_earning UNIQUE (driver_id, ride_id)`.
    - Indeks performa query pendapatan: `idx_driver_earnings_driver_date`, `idx_driver_earnings_ride`, `idx_driver_earnings_status`, `idx_driver_earnings_created_at`.
  - **Trip History Composite Indexes & Unified View**:
    - Indeks komposit pada tabel `rides`: `idx_rides_passenger_status_created`, `idx_rides_driver_status_created`, `idx_rides_completed_at_desc`.
    - View terpadu `view_trip_history_details` menggabungkan data perjalanan, ulasan rating, status pembayaran, dan rincian buku besar pendapatan driver.
- **Backend Repositories & Type Definitions**:
  - `backend/src/rating/rating.types.ts` & `backend/src/rating/rating.repository.ts`.
  - `backend/src/payment/driver-earnings-ledger.types.ts` & `backend/src/payment/driver-earnings-ledger.repository.ts`.
  - `backend/src/ride/trip-history.types.ts` & `backend/src/ride/trip-history.repository.ts`.
- **Authorization & Data Scoping Layer**:
  - Penumpang hanya dapat mengakses rating dan riwayat perjalanan miliknya sendiri (`CUSTOMER`).
  - Mitra pengemudi hanya dapat mengakses ringkasan pendapatan dan ulasan miliknya (`DRIVER`).
  - Admin memiliki akses audit menyeluruh (`ADMIN`).
- **Automated Acceptance Test Suite (`backend/test/phase7-database-foundation.spec.ts`)**:
  - 10 skenario pengujian komprehensif menguji sintaks SQL migrasi, batasan relasional, pencegahan rating ganda, presisi integer Rupiah, integritas pembagian komisi, dan otorisasi akses (100% Passed).

---

## [Phase 6C] - 2026-10-08
### Added
- **8-Step Atomic Settlement Engine (`backend/src/payment/settlement.service.ts`)**:
  - Alur settlement saat pembayaran berstatus `PAID`:
    1. Validasi pembayaran (PAID, positive integer IDR amount, assigned payee driver, `isSettled === false`).
    2. Ekstraksi fare snapshot terkunci dari ride order atau snapshot payment.
    3. Ekstraksi konfigurasi revenue share aktif (Default 85% Driver / 15% Platform, dinamis & dapat diubah via runtime API).
    4. Perhitungan driver share (`Math.round(fare * (driverSharePercent / 100))`) dengan integer arithmetic.
    5. Perhitungan platform share (`fare - driverShare`, menjamin 100% tanpa kebocoran sen/rupiah pembulatan).
    6. Pembuatan transaksi berpasangan buku besar (Debit `CASH_RECEIVABLE_IDR` / `PAYMENT_CLEARING_IDR`, Credit `DRIVER_PAYABLE_<driverId>`, Credit `PLATFORM_REVENUE_IDR`).
    7. Verifikasi ketat `SUM(debit) === SUM(credit)`.
    8. Commit transaksi buku besar atomik berintegritas tinggi dengan mekanisme rollback jika terjadi kegagalan.
  - Proteksi duplikasi settlement: Menolak penyelesaian ulang pembayaran dengan `ConflictException`.
  - Penanganan pembulatan pecahan Rupiah (`rounding`) dengan integer arithmetic presisi.
- **Authoritative Driver Earnings (`GET /drivers/me/earnings`)**:
  - Endpoint read-only untuk mitra driver (`Role.DRIVER`).
  - Menghitung pendapatan mitra driver secara mutlak dari saldo akun buku besar (`DRIVER_PAYABLE_<driverId>`) via `balance = credit - debit`.
  - Mencegah tabel saldo mutable terpisah sebagai sumber kebenaran (buku besar adalah *single source of truth*).
  - Mengembalikan `totalCompletedRides`, `grossFare`, `driverEarnings`, `platformFee`, `period`, `currency: 'IDR'`, `authoritativeSource: 'LEDGER'`, `ledgerAccountId`, `ledgerBalance`.
- **Database Migration (`database/migrations/006c_settlement_and_earnings.sql`)**:
  - Kolom settlement pada `payments`: `is_settled`, `settled_at`, `ledger_transaction_id`, `driver_share_amount`, `platform_fee_amount`.
  - Tabel audit `payment_settlements`.
  - View SQL `view_driver_earnings_authoritative_ledger`.
- **Automated Acceptance Tests (`backend/test/phase6c-settlement-earnings.spec.ts`)**:
  - 10 skenario pengujian komprehensif mencakup 8 tes wajib: 85/15 split, integer arithmetic, rounding, multiple rides, duplicate settlement, failed transaction rollback, ledger remains balanced, driver earnings matches ledger, dynamic config, dan webhook digital settlement (100% Passed).

---

## [Phase 6B] - 2026-10-08
### Added
- **Payment Provider Abstraction & Providers (`backend/src/payment/payment-provider.interface.ts`)**:
  - Interface universal `PaymentProvider` (`createPayment`, `getPaymentStatus`, `verifyWebhook`, `refundPayment`) mengembalikan normalized response.
  - `CashPaymentProvider`: COMPLETED RIDE → create CASH payment → PAID langsung dengan ledger settlement instan.
  - `MockDigitalPaymentProvider`: Mendukung siklus asinkron testing (COMPLETED → PENDING → Webhook Callback → verify → PAID).
  - Utilitas signature generator untuk pengujian webhook HMAC-SHA256.
- **Webhook Security & Replay Protection (`backend/src/payment/payment.service.ts`)**:
  - Abstraksi verifikasi signature berbasis HMAC-SHA256 (`x-webhook-signature`).
  - Proteksi replay attack dengan validasi timestamp drift maksimal 300 detik (`x-webhook-timestamp`).
  - Proteksi duplikasi event (`processedWebhookEvents`) untuk jaminan idempotensi mutlak pada level webhook.
- **Race Condition & Mutex Protection**:
  - In-memory key-based mutex locking per `paymentId` (`withLock`) menjamin penanganan serial saat terjadi persaingan akses antara cancel dan webhook sukses.
  - Serialisasi webhook ganda atau serentak via `Promise.all` mencegah pencatatan ledger ganda.
- **Payment API & Authorization RBAC (`backend/src/payment/payment.controller.ts`)**:
  - `POST /payments`: Inisiasi pembayaran CASH / DIGITAL.
  - `GET /payments/:id`: Detail pembayaran dengan proteksi RBAC (Passenger hanya melihat miliknya, Driver melihat ordernya, Admin melihat seluruhnya).
  - `GET /payments/:id/status`: Normalized payment status endpoint.
  - `POST /payments/:id/cancel`: Pembatalan pembayaran berstatus PENDING.
  - `POST /payments/:id/refund`: Pengembalian dana pembayaran PAID (khusus peran Admin).
  - `POST /payments/webhook/:provider`: Inbound webhook endpoint untuk payment provider.
- **Automated Acceptance Tests (`backend/test/phase6b-payment-service.spec.ts`)**:
  - 12 skenario pengujian komprehensif: cash payment, digital payment, duplicate payment, duplicate webhook, invalid webhook, unauthorized payment access, payment for incomplete ride, successful payment, failed payment, refund state, concurrent webhook, idempotency (100% Passed).

---

## [Phase 6A] - 2026-10-08
### Added
- **Database Migration (`database/migrations/006_payment_and_ledger.sql`)**:
  - Tabel `payments`: Kolom `id`, `ride_id` (UNIQUE), `payer_id`, `payee_driver_id`, `amount` (Integer Rupiah), `currency` (IDR), `method` (`CASH`/`DIGITAL`), `status` (`PENDING` s/d `REFUNDED`), `provider`, `provider_payment_id`, `idempotency_key` (UNIQUE), `paid_at`, `failed_at`, `refunded_at`.
  - Tabel `ledger_accounts`: Akun bertipe `DRIVER_PAYABLE`, `PLATFORM_REVENUE`, `PAYMENT_CLEARING`, `CASH_RECEIVABLE`, dan `REFUND_PAYABLE`.
  - Tabel `ledger_transactions` & `ledger_entries`: Double-entry balanced entries dengan integritas ketat `SUM(debit) = SUM(credit)`.
  - Tabel `payment_split_configs`: Default konfigurasi bagi hasil 85% Driver / 15% Platform yang dinamis.
- **Double-Entry Ledger Engine (`backend/src/payment/ledger.service.ts`)**:
  - Enforce aturan mutlak akuntansi perbankan `SUM(debit) === SUM(credit)`.
  - Validasi entri debit dan kredit non-negatif.
  - Pencegahan duplikasi referensi transaksi ledger (`referenceType` + `referenceId`).
  - Kalkulasi saldo riil akun buku besar (`getAccountBalance`) dan verifikasi audit (`auditAllTransactions`).
- **Core Payment Service (`backend/src/payment/payment.service.ts`)**:
  - Provider-independent payment lifecycle engine.
  - Idempotency key handling untuk mencegah *double billing*.
  - Enforce aturan bisnis 1 ride = 1 payment record (penolakan pembayaran ganda).
  - Validasi kelayakan: Hanya order berstatus `COMPLETED` yang dapat dibayar (penolakan order `SEARCHING`, `ASSIGNED`, `IN_TRIP`).
  - Validasi nominal IDR bulat (integer), penolakan nominal nol atau negatif.
  - Pembagian komisi dinamis 85/15 secara presisi.
  - Atomicity dan rollback otomatis bila pencatatan ledger gagal.
- **Payment Provider Abstraction (`backend/src/payment/payment-provider.interface.ts`)**:
  - Interface universal `PaymentProvider` (`createPayment`, `getPaymentStatus`, `verifyWebhook`, `refundPayment`).
  - Implementasi `MockPaymentProvider` untuk isolasi vendor pada tahap 6A.
- **REST Endpoints (`backend/src/payment/payment.controller.ts`)**:
  - `POST /payments`: Memproses pembayaran ride dan mencatat transaksi buku besar berpasangan.
  - `GET /payments/:id`: Detail pembayaran.
  - `GET /payments/ride/:rideId`: Pembayaran berdasarkan order perjalanan.
  - `GET /payments/config/split` & `PUT /payments/config/split`: Konfigurasi bagi hasil dinamis.
  - `GET /ledger/accounts`: Daftar akun buku besar.
  - `GET /ledger/balance/:accountId`: Saldo akun buku besar.
  - `GET /ledger/transactions/:id`: Transaksi ledger beserta entri debit/kredit.
  - `GET /ledger/audit`: Audit integritas seluruh transaksi ledger.
- **Automated Acceptance Tests (`backend/test/phase6a-payment-ledger.spec.ts`)**:
  - 12 skenario pengujian komprehensif mencakup validasi nominal Rupiah integer, split 85/15, penolakan order belum selesai, proteksi duplikasi, audit keseimbangan debit/kredit, dan rollback atomik (100% Passed).

---

## [Phase 5B] - 2026-10-07
### Added
- **Driver Matching & Dispatch Engine (`backend/src/ride/ride-dispatch.service.ts`)**:
  - Filter kelayakan driver ketat: Role `DRIVER`, `APPROVED`, 4 dokumen sah (KTP, SIM_C, STNK, SKCK) non-expired, kendaraan aktif & disetujui, `ONLINE`, GPS status `FRESH` (< 10s).
  - Eliminasi mutlak pengemudi dengan status `STALE` (> 10s s/d 30s) atau `EXPIRED` (> 30s).
  - Pencarian armada terdekat dalam radius inisial 1500m terintegrasi dengan `GeospatialService` Phase 4 (Redis GEO & PostGIS fallback).
  - Ranking deterministik berjenjang: ETA terpendek -> Jarak fisik pickup terdekat -> Usia GPS teranyar -> Idle duration terlama -> Driver ID.
  - Siklus penawaran (offer) berdurasi 30 detik per kandidat.
- **Atomic Concurrency & Lock Management (`backend/src/ride/ride.service.ts`)**:
  - Pencegahan race condition penugasan dua order ke satu driver secara serentak.
  - Optimistic locking via `version` untuk mencegah double accept (HTTP 409 Conflict).
  - Penanganan kasus reject tawaran (`rejectOffer`) dan batas waktu respon habis (`handleOfferTimeout`) yang secara otomatis mengalihkan order ke kandidat driver berikutnya.
  - Order tetap berstatus `SEARCHING` saat kandidat driver habis (tidak dibatalkan sepihak).
- **Driver Lifecycle Endpoints (`backend/src/ride/ride.controller.ts`)**:
  - `POST /rides/:id/accept`: Menerima tawaran pesanan (`SEARCHING` -> `ASSIGNED`).
  - `POST /rides/:id/reject`: Menolak tawaran pesanan dan melanjutkan ke kandidat berikutnya.
  - `POST /rides/:id/dispatch/timeout`: Menandai offer kedaluwarsa 30s dan melanjutkan ke kandidat berikutnya.
  - `POST /rides/:id/arrived`: Menandai driver tiba di titik jemput (`ASSIGNED` -> `ARRIVED`).
  - `POST /rides/:id/start`: Memulai perjalanan dengan penumpang (`ARRIVED` -> `IN_TRIP`).
  - `POST /rides/:id/complete`: Menyelesaikan pesanan (`IN_TRIP` -> `COMPLETED`).
  - `POST /rides/:id/cancel`: Membatalkan pesanan dengan alasan jelas (`CANCELLED`).
  - `GET /rides/:id/dispatch-attempts`: Melihat rekaman riwayat percobaan penawaran driver.
- **Skema Database Dispatch Attempts (`database/migrations/005_ride_ordering.sql`)**:
  - Tabel `ride_dispatch_attempts` dengan kolom `id`, `ride_id`, `driver_id`, `attempt_number`, `distance_meters`, `eta_seconds`, `status` (`OFFERED`, `ACCEPTED`, `REJECTED`, `TIMEOUT`, `FAILED`), `offered_at`, `responded_at`, `created_at`.
- **Automated Acceptance Test Suite (`backend/test/phase5-acceptance.spec.ts`)**:
  - 20 skenario uji otomatis mencakup seluruh kriteria eliminasi driver, radius 1500m, ranking, reject/timeout cascade, concurrency locking, proteksi double accept, dan state transition locking. Seluruh 20 uji lolos (100% Passed).

---

## [Phase 5A] - 2026-10-06
### Added
- **Database Migrasi `database/migrations/005_ride_ordering.sql`**:
  - Tabel `rides` dan `ride_state_history`.
- **Fare Calculation Engine (`backend/src/ride/fare.service.ts`)**:
  - Formula tarif resmi Banjarmasin: Base Rp7.000, Jarak Rp2.200/km, Durasi Rp200/menit, Tarif minimum Rp10.000.
- **Core Ride Service (`backend/src/ride/ride.service.ts`) & Controller**:
  - Pembuatan order penumpang (`POST /rides/order`), detail order (`GET /rides/:id`), riwayat order (`GET /rides/my`).

---

## [Phase 4] - 2026-10-06
### Added
- Redis GEO driver location tracking dan PostGIS fallback geospatial query.
- Location freshness engine (FRESH < 10s, STALE 10-30s, EXPIRED > 30s).
- Routing service Haversine & OSRM integration untuk jarak dan durasi Kota Banjarmasin.

---

## [Phase 3] - 2026-10-06
### Added
- Driver profile, KYC 4 dokumen (KTP, SIM C, STNK, SKCK), verifikasi kendaraan, dan toggle status operasional ONLINE/OFFLINE.

---

## [Phase 2] - 2026-10-06
### Added
- Autentikasi JWT, normalisasi nomor telepon format E.164 (+62), rate limiting OTP, Role-based Access Control (CUSTOMER, DRIVER, ADMIN).

---

## [Phase 1] - 2026-10-06
### Added
- Arsitektur pondasi monorepo, konfigurasi Docker Compose PostgreSQL 16 + PostGIS 3.4 dan Redis 7.2.
