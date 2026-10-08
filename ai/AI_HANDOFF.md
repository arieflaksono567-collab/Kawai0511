# KAWAI 0511 — AI Handoff Document

> **Dokumen Transisi & Konteks AI (Updated: Phase 6C Complete)**  
> Dokumen ini mencatat kondisi arsitektur, implementasi nyata, dependensi, dan batasan teknis saat ini pada repository KAWAI 0511.

---

## 1. Identitas Proyek & Status Terkini
- **Nama Repository**: KAWAI 0511 (Aplikasi Ride-Hailing Kota Banjarmasin, Kalimantan Selatan)
- **Status Fase**:
  - Phase 1 (Project Foundation): **FROZEN**
  - Phase 2 (Authentication & User System): **FROZEN**
  - Phase 3 (Driver Management & Verification): **FROZEN**
  - Phase 4 (Geospatial & Location Engine): **FROZEN**
  - Phase 5A (Ride Ordering & State Machine): **FROZEN**
  - Phase 5B (Driver Matching & Dispatch Engine): **FROZEN**
  - Phase 6A (Payment DB & Double-Entry Ledger): **FROZEN**
  - Phase 6B (Payment Service & Webhook Security): **FROZEN**
  - Phase 6C (Settlement & Driver Earnings): **COMPLETE / VALIDATED**
- **Boundary**:
  - Dilarang membongkar / refactor arsitektur Phase 1 s/d Phase 6B.
  - Core payment engine provider-independent.
  - Tidak mengintegrasikan provider nyata (DANA, OVO, QRIS riil, Bank) pada tahap ini; gunakan `MockDigitalPaymentProvider` & `CashPaymentProvider`.
  - Tidak membuat KAWAI menjadi penerbit uang elektronik tanpa lisensi (ledger adalah internal clearing & record of truth).
  - Tidak membuat mutable separate driver balance table sebagai sumber kebenaran; ledger adalah authoritative source of truth.
  - Tidak membuat fitur withdrawal pada tahap ini.

---

## 2. Implementasi Aktual Phase 6C (Settlement & Driver Earnings)
- **8-Step Atomic Settlement Workflow (`backend/src/payment/settlement.service.ts`)**:
  1. Validasi payment: Harus berstatus `PAID`, nominal bulat positif IDR, payee driver terverifikasi, dan belum diselesaikan (`isSettled === false`).
  2. Ambil fare snapshot: Snapshot tarif terkunci dari ride order atau snapshot payment record.
  3. Ambil konfigurasi revenue share: Default 85% Mitra Driver / 15% Platform, dinamis & dapat diperbarui via API.
  4. Hitung driver share: `driverShare = Math.round(fare * (driverSharePercent / 100))` (Integer arithmetic IDR Rupiah).
  5. Hitung platform share: `platformShare = fare - driverShare` (Menjamin tidak ada sisa kebocoran desimal / pembulatan).
  6. Buat transaksi buku besar berpasangan:
     - CASH: Debit `CASH_RECEIVABLE_IDR` (gross fare), Credit `DRIVER_PAYABLE_<driverId>` (driver share), Credit `PLATFORM_REVENUE_IDR` (platform fee).
     - DIGITAL: Debit `PAYMENT_CLEARING_IDR` (gross fare), Credit `DRIVER_PAYABLE_<driverId>` (driver share), Credit `PLATFORM_REVENUE_IDR` (platform fee).
  7. Pastikan debit = credit: `SUM(debit) === SUM(credit)`.
  8. Commit transaksi atomik buku besar: Menghasilkan `ledger_transaction` dan entri berpasangan. Jika terjadi kegagalan sistemik, rollback otomatis dieksekusi dan payment tetap berstatus `isSettled: false`.
- **Proteksi Duplikasi Settlement**:
  - Eksekusi penyelesaian ulang pada payment yang telah diselesaikan (`payment.isSettled: true`) langsung ditolak dengan `ConflictException` (HTTP 409).
- **Authoritative Driver Earnings (`GET /drivers/me/earnings`)**:
  - Read-only endpoint untuk driver (`Role.DRIVER`).
  - Nilai saldo / pendapatan mitra dihitung secara langsung dari buku besar: `balance = totalCredit - totalDebit` dari akun `DRIVER_PAYABLE_<driverId>`.
  - Mengembalikan:
    - `totalCompletedRides`: Jumlah order yang telah diselesaikan dan dicatat di buku besar.
    - `grossFare`: Total tarif kotor perjalanan.
    - `driverEarnings`: Hak bersih mitra driver (sesuai saldo buku besar).
    - `platformFee`: Total potongan komisi platform.
    - `period`: Rentang waktu ('all-time', 'today', 'week', 'month').
    - `currency`: 'IDR'.
    - `authoritativeSource`: 'LEDGER'.
    - `ledgerAccountId`: ID akun buku besar milik mitra driver.
    - `ledgerBalance`: Saldo riil buku besar.
- **Database Migration (`database/migrations/006c_settlement_and_earnings.sql`)**:
  - Skema tabel `payment_settlements`, ekstensi kolom settlement pada `payments`, dan view `view_driver_earnings_authoritative_ledger`.

---

## 3. Implementasi Aktual Phase 6B (Payment Service & Webhooks)
- **Provider Abstraction (`backend/src/payment/payment-provider.interface.ts`)**:
  - `PaymentProvider`: `createPayment()`, `getPaymentStatus()`, `verifyWebhook()`, `refundPayment()`.
  - `CashPaymentProvider`: COMPLETED RIDE → create CASH payment → PAID langsung dengan ledger instan.
  - `MockDigitalPaymentProvider`: COMPLETED → PENDING → provider URL/ref → webhook callback → verify signature & replay → PAID + ledger settlement.
- **Webhook Security**:
  - HMAC-SHA256 signature verification abstraction.
  - Replay protection & timestamp drift validation (max 300s).
  - Idempotency & duplicate event ID tracking (mencegah double-settlement).
- **Concurrency & Locking**:
  - Key-based in-memory mutex (`withLock`) per `paymentId` mencegah race condition antara cancel dan webhook callback, serta serialisasi concurrent webhook (`Promise.all`).
- **Otorisasi RBAC**:
  - Passenger hanya dapat melihat transaksi miliknya (`payerId === user.id`).
  - Driver hanya dapat melihat transaksi ordernya (`payeeDriverId === user.id`).
  - Admin memiliki akses audit penuh ke seluruh riwayat pembayaran.
- **REST Endpoints (`backend/src/payment/payment.controller.ts`)**:
  - `POST /payments`
  - `GET /payments/:id`
  - `GET /payments/:id/status`
  - `POST /payments/:id/cancel`
  - `POST /payments/:id/refund`
  - `POST /payments/webhook/:provider`

---

## 2. Implementasi Aktual Phase 6A (Payment & Double-Entry Ledger)

### A. Skema Database (`database/migrations/006_payment_and_ledger.sql`)
- **Tabel `payments`**:
  - `id`: UUID Primary Key.
  - `ride_id`: UUID Unique (Integritas 1 Ride = 1 Payment).
  - `payer_id`, `payee_driver_id`: UUID.
  - `amount`: Integer Rupiah (IDR).
  - `currency`: 'IDR'.
  - `method`: 'CASH' | 'DIGITAL'.
  - `status`: 'PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'.
  - `provider`: Abstraksi nama provider.
  - `provider_payment_id`: Nullable ID dari gateway provider.
  - `idempotency_key`: Unik untuk idempotency guarantee.
  - Timestamps: `paid_at`, `failed_at`, `refunded_at`, `created_at`, `updated_at`.
- **Tabel `ledger_accounts`**:
  - Tipe akun: `DRIVER_PAYABLE`, `PLATFORM_REVENUE`, `PAYMENT_CLEARING`, `CASH_RECEIVABLE`, `REFUND_PAYABLE`.
- **Tabel `ledger_transactions`**:
  - `reference_type`, `reference_id` (Unique constraint), `description`.
- **Tabel `ledger_entries`**:
  - Relasi ke transaksi dan akun, `debit` (>= 0), `credit` (>= 0).
  - Constraint: `SUM(debit) = SUM(credit)`.
- **Tabel `payment_split_configs`**:
  - Konfigurasi bagi hasil dinamis: default `driver_share_percent = 85.00`, `platform_share_percent = 15.00`.

### B. Double-Entry Ledger Engine (`backend/src/payment/ledger.service.ts`)
- Menerapkan prinsip akuntansi double-entry murni:
  - Setiap transaksi wajib memiliki minimal 2 entri dan seimbang secara mutlak `SUM(debit) === SUM(credit)`.
  - Entri bernilai negatif ditolak keras (`BadRequestException`).
  - Pencegahan duplikasi transaksi via pasangan referensi `(referenceType, referenceId)`.
  - Perhitungan saldo buku besar per akun (`getAccountBalance`).

### C. Payment Service (`backend/src/payment/payment.service.ts`)
- Idempotency handling: Request berulang dengan `idempotencyKey` yang sama mengembalikan record pembayaran yang sudah ada tanpa menduplikasi ledger.
- Single Payment Enforcement: Menolak double payment untuk order perjalanan yang sama (`ConflictException`).
- Ride Eligibility: Menolak pembayaran untuk perjalanan yang belum `COMPLETED` (`incomplete ride rejected`).
- Split calculation: Pembagian 85% pengemudi dan 15% platform dihitung secara presisi dalam integer Rupiah.
- Atomicity & Rollback: Jika pencatatan buku besar gagal, status pembayaran tidak disimpan (database rollback semantics).

### D. Provider Abstraction (`backend/src/payment/payment-provider.interface.ts`)
- Interface `PaymentProvider`:
  - `createPayment()`
  - `getPaymentStatus()`
  - `verifyWebhook()`
  - `refundPayment()`
- Implementasi `MockPaymentProvider` sebagai gateway mock development.

---

## 3. Implementasi Aktual Phase 5B

### A. Driver Eligibility
Implementasi ketat pada `DriverEligibilityService` (`backend/src/driver/driver-eligibility.service.ts`):
- Memeriksa role pengguna: Wajib `DRIVER`.
- Status verifikasi pengemudi: Wajib `APPROVED`.
- Dokumen wajib: 4 dokumen (`KTP`, `SIM_C`, `STNK`, `SKCK`) wajib `APPROVED` dan tidak berstatus `EXPIRED`.
- Kendaraan aktif: Wajib memiliki kendaraan berstatus `APPROVED` dan `is_active = true`.
- Status operasional: Wajib `ONLINE`. Driver `OFFLINE` otomatis tereksklusi.
- GPS Freshness: Menggunakan Phase 4 `LocationFreshnessService`. Status wajib `FRESH` (usia GPS < 10 detik). Status `STALE` (> 10s s/d 30s) atau `EXPIRED` (> 30s) ditolak keras dari penawaran dispatch.
- Tidak sedang dalam perjalanan aktif: Pengemudi yang memiliki pesanan `ASSIGNED`, `ARRIVED`, atau `IN_TRIP` dieksklusi dari matching.

### B. Search Radius & Geospatial Integration
- Radius pencarian inisial: **1500 meter** di sekitar titik jemput penumpang.
- Menggunakan infrastruktur Phase 4 (`GeospatialService`, `RedisGeoService`, PostGIS fallback).
- Tidak membuat sistem geospatial duplikat / kedua.

### C. Multi-Criteria Candidate Ranking (Deterministik)
Urutan pemeringkatan kandidat driver pengemudi:
1. **ETA Pickup**: Urutan estimasi kedatangan terpendek (`estimatedEtaSeconds` ascending).
2. **Distance Pickup**: Jika ETA sama, driver dengan jarak fisik lebih dekat menang (`distanceMeters` ascending).
3. **GPS Freshness**: Jika masih sama, usia koordinat GPS teranyar menang (`gpsAgeSeconds` ascending).
4. **Idle Duration**: Jika masih sama, mitra yang menganggur / online lebih lama diprioritaskan (`idleDurationSeconds` descending).
5. **Driver ID**: Tie-breaker string deterministik terakhir.

### D. Dispatch Offer Lifecycle & State Transitions
File: `backend/src/ride/ride-dispatch.service.ts` & `backend/src/ride/ride.service.ts`
- Siklus penawaran: Durasi batas waktu respon adalah **30 detik** (`OFFER_TIMEOUT_SECONDS = 30`).
- Saat ride `SEARCHING`, kandidat peringkat teratas diberikan status `OFFERED`.
- Jika driver menolak (`POST /rides/:id/reject`): Dispatch attempt dicatat `REJECTED`, offer dialihkan ke kandidat berikutnya.
- Jika batas waktu habis (`POST /rides/:id/dispatch/timeout`): Dispatch attempt dicatat `TIMEOUT`, offer dialihkan ke kandidat berikutnya.
- Jika driver menjadi unavailable: Offer beralih ke kandidat berikutnya.
- Jika tidak ada kandidat / seluruh kandidat habis: Order **tetap dalam status `SEARCHING`** dan dispatch attempt dicatat. Order **tidak dibatalkan sepihak**.

### E. Concurrency & Atomic Locking
- Penugasan driver bersifat atomik: Proteksi dua penumpang mencari driver bersamaan pada armada yang sama menggunakan atomic lock in-memory & versioning `version` optimistic locking.
- Hanya satu ride yang dapat memenangkan driver.
- Mencegah double accept dengan melempar HTTP 409 `ConflictException`.
- Penumpang tidak dapat memanipulasi penugasan driver (tidak dapat menyuntikkan driverId saat order dibuat).

### F. Driver Endpoints & State Machine
1. `POST /rides/:id/accept`: Hanya driver yang ditawarkan order tersebut, memvalidasi eligibility, beralih ke `ASSIGNED` (`assigned_at`).
2. `POST /rides/:id/reject`: Driver menolak tawaran, beralih ke kandidat berikutnya.
3. `POST /rides/:id/dispatch/timeout`: Server/worker menandai timeout 30 detik, beralih ke kandidat berikutnya.
4. `POST /rides/:id/arrived`: Hanya assigned driver, beralih `ASSIGNED` → `ARRIVED` (`arrived_at`).
5. `POST /rides/:id/start`: Hanya assigned driver, beralih `ARRIVED` → `IN_TRIP` (`started_at`).
6. `POST /rides/:id/complete`: Hanya assigned driver, beralih `IN_TRIP` → `COMPLETED` (`completed_at`).
7. `POST /rides/:id/cancel`: Pembatalan valid dengan alasan dan rekaman `cancelled_at`. Order `COMPLETED` atau `CANCELLED` dikunci permanen dan tidak dapat dimulai kembali.
8. `GET /rides/:id/dispatch-attempts`: Melihat log percobaan dispatch untuk audit transparansi.

### G. Dispatch Attempts Logging Schema
Tabel `ride_dispatch_attempts` pada `database/migrations/005_ride_ordering.sql`:
- `id` (UUID PRIMARY KEY)
- `ride_id` (UUID REFERENCES rides)
- `driver_id` (UUID REFERENCES driver_profiles)
- `attempt_number` (INT NOT NULL)
- `distance_meters` (DOUBLE PRECISION)
- `eta_seconds` (INT)
- `status` (VARCHAR: OFFERED, ACCEPTED, REJECTED, TIMEOUT, FAILED)
- `offered_at` (TIMESTAMPTZ NOT NULL)
- `responded_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ DEFAULT NOW())

---

## 3. Hasil Automated Test Phase 5B
File: `backend/test/phase5-acceptance.spec.ts`
Total 20 skenario uji lolos (100% Passed):
1. `TEST 1: only eligible drivers matched` - PASSED
2. `TEST 2: stale driver excluded` - PASSED
3. `TEST 3: expired driver excluded` - PASSED
4. `TEST 4: offline driver excluded` - PASSED
5. `TEST 5: unapproved driver excluded` - PASSED
6. `TEST 6: inactive vehicle excluded` - PASSED
7. `TEST 7: driver already on active ride excluded` - PASSED
8. `TEST 8: radius filtering excludes driver beyond 1500m` - PASSED
9. `TEST 9: closest driver ranking breaks tie when ETA is identical` - PASSED
10. `TEST 10: ETA ranking places faster arrival candidate at rank #1` - PASSED
11. `TEST 11: reject -> offer immediately moves to next driver` - PASSED
12. `TEST 12: timeout -> offer transitions to next candidate driver` - PASSED
13. `TEST 13: no driver available -> ride remains SEARCHING without cancelling` - PASSED
14. `TEST 14: concurrent assignment protection guarantees only one ride wins driver` - PASSED
15. `TEST 15: double accept rejected with HTTP 409 Conflict` - PASSED
16. `TEST 16: invalid state transition rejected (e.g. SEARCHING directly to IN_TRIP)` - PASSED
17. `TEST 17: unauthorized driver rejected from accepting an offer assigned to another` - PASSED
18. `TEST 18: customer cannot manipulate driver assignment` - PASSED
19. `TEST 19: completed ride cannot restart or transition backwards` - PASSED
20. `TEST 20: cancelled ride cannot restart or transition to another state` - PASSED

---

## 4. Langkah Selanjutnya (Phase 6)
- **Phase 6: Payment, Wallet & Revenue Split**:
  - Dompet KawaiPay, Top up saldo, Saldo minimum driver untuk menerima order.
  - Skema pembagian komisi otomatis: 85% untuk mitra driver / 15% platform fee KAWAI.
  - Riwayat mutasi transaksi dompet dan settlement.
