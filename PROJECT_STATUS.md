# KAWAI 0511 — Project Status & Roadmap

> **CATATAN REKONSILIASI KANONIS**: Sumber status resmi dan tunggal (Single Source of Truth / SSOT) untuk seluruh fase (Phase 0 s.d. Phase 10), hasil pengujian aktual, dan audit keamanan terletak di **`.ai/PROJECT_STATUS.md`**. Dokumen ini dipertahankan sebagai arsip historis status implementasi Phase 6C.


## 1. Tabel Ringkasan Fase

| Phase | Nama Fase | Status | Tanggal Selesai | Keterangan & Pencapaian Utama |
|---|---|---|---|---|
| **Phase 1** | Foundation & Project Setup | **COMPLETE / FROZEN** | 2026-10-06 | Monorepo structure, Docker PostGIS & Redis, skema migrasi awal. |
| **Phase 2** | Auth & Identity | **COMPLETE / FROZEN** | 2026-10-06 | JWT Auth, nomor HP E.164 (+62), OTP rate limiter, Role RBAC. |
| **Phase 3** | Driver Onboarding & KYC | **COMPLETE / FROZEN** | 2026-10-06 | 4 Dokumen verifikasi, registrasi kendaraan, status operasional ONLINE/OFFLINE. |
| **Phase 4** | Location & Geospatial Engine | **COMPLETE / FROZEN** | 2026-10-06 | Redis GEO, PostGIS fallback, Haversine, Freshness (FRESH/STALE/EXPIRED). |
| **Phase 5A**| Ride Ordering & State Machine | **COMPLETE / FROZEN** | 2026-10-06 | Fare engine Banjarmasin, order lifecycle state machine, audit logs. |
| **Phase 5B**| Driver Matching & Dispatch | **COMPLETE / FROZEN** | 2026-10-07 | Radius 1500m, deterministic ranking, 30s timeout, reject/timeout cascades, atomic assignment. |
| **Phase 6A**| Payment DB & Double-Entry Ledger | **COMPLETE / FROZEN** | 2026-10-08 | Provider-independent payment, double-entry balanced ledger, 85/15 configurable split, idempotency. |
| **Phase 6B**| Payment Service & Webhook Security | **COMPLETE / FROZEN** | 2026-10-08 | CashPaymentProvider, MockDigitalPaymentProvider, webhook signature & replay protection, RBAC, race condition mutex. |
| **Phase 6C**| Settlement & Driver Earnings | **COMPLETE / VALIDATED** | 2026-10-08 | 8-step atomic settlement workflow, 85/15 split integer arithmetic, duplicate settlement protection, read-only ledger-authoritative earnings (`GET /drivers/me/earnings`). |
| **Phase 7** | Real-time Tracking & WebSocket | *PLANNED* | - | WebSocket Gateway, live telemetry, subscriber map updates. |
| **Phase 8** | Customer Rating & Reviews | *PLANNED* | - | Rating 1-5 bintang, tips, evaluasi performa mitra. |

---

## 2. Status Modul Phase 6C (Settlement & Driver Earnings)
- **Settlement Engine (`backend/src/payment/settlement.service.ts`)**:
  - Alur 8-Tahap Atomik ketika payment berstatus PAID:
    1. Validasi payment (status PAID, strictly positive integer amount, valid payee driver).
    2. Ambil fare snapshot (dari ride snapshot atau payment record).
    3. Ambil konfigurasi revenue share (Default 85% Driver / 15% Platform, dinamis & dapat diubah saat runtime).
    4. Hitung driver share (`Math.round(fare * (driverSharePercent / 100))`).
    5. Hitung platform share (`fare - driverShare`, menjamin `driverShare + platformShare === fare` tanpa kebocoran pembulatan).
    6. Buat transaksi buku besar berpasangan (CASH: Debit `CASH_RECEIVABLE`, Credit `DRIVER_PAYABLE`, Credit `PLATFORM_REVENUE`; DIGITAL: Debit `PAYMENT_CLEARING`, Credit `DRIVER_PAYABLE`, Credit `PLATFORM_REVENUE`).
    7. Verifikasi ketat `SUM(debit) === SUM(credit)`.
    8. Commit transaksi atomik buku besar, rollback otomatis jika terjadi kegagalan.
  - Proteksi duplikasi settlement: Upaya menyelesaikan ulang pembayaran yang sudah terselesaikan ditolak dengan `ConflictException`.
  - Arithmetic IDR bulat (integer), penanganan pembulatan presisi tanpa selisih 1 Rupiah pun.
- **Authoritative Driver Earnings (`GET /drivers/me/earnings`)**:
  - Read-only endpoint dengan proteksi JWT & Role Driver (`Role.DRIVER`).
  - Nilai pendapatan (`driverEarnings`) bersumber langsung dari saldo akun buku besar (`DRIVER_PAYABLE_<driverId>`) via `balance = credit - debit`.
  - Tidak menggunakan mutable balance terpisah sebagai sumber kebenaran (Buku besar / ledger bersifat mutlak otoritatif).
  - Output ringkasan: `totalCompletedRides`, `grossFare`, `driverEarnings`, `platformFee`, `period`, `currency: 'IDR'`, `authoritativeSource: 'LEDGER'`, `ledgerAccountId`, `ledgerBalance`.
- **Database Migration (`database/migrations/006c_settlement_and_earnings.sql`)**:
  - Kolom settlement pada `payments` (`is_settled`, `settled_at`, `ledger_transaction_id`, `driver_share_amount`, `platform_fee_amount`).
  - Tabel audit `payment_settlements`.
  - View SQL `view_driver_earnings_authoritative_ledger` untuk integrasi pelaporan analitik database.

---

## 3. Status Modul Phase 6B (Payment Service & Webhooks)
- **Payment Provider Abstraction (`backend/src/payment/payment-provider.interface.ts`)**:
  - `PaymentProvider` interface: `createPayment()`, `getPaymentStatus()`, `verifyWebhook()`, `refundPayment()`.
  - Normalisasi response internal (`NormalizedPaymentResponse`, `NormalizedWebhookResult`, `NormalizedRefundResponse`).
  - `CashPaymentProvider`: COMPLETED RIDE → create CASH payment → PAID langsung dengan ledger instan.
  - `MockDigitalPaymentProvider`: COMPLETED → PENDING → provider URL/ref → webhook callback → verify → PAID + ledger settlement.
- **REST Endpoints (`backend/src/payment/payment.controller.ts`)**:
  - `POST /payments`: Inisiasi pembayaran CASH (PAID) atau DIGITAL (PENDING).
  - `GET /payments/:id`: Detail pembayaran dengan proteksi otorisasi RBAC.
  - `GET /payments/:id/status`: Normalized payment status.
  - `POST /payments/:id/cancel`: Pembatalan order yang masih PENDING.
  - `POST /payments/:id/refund`: Pengembalian dana transaksi PAID (khusus Admin).
  - `POST /payments/webhook/:provider`: Inbound webhook provider dengan verifikasi keamanan ketat.
- **Webhook Security & Replay Protection**:
  - HMAC-SHA256 signature verification abstraction.
  - Timestamp validation & window drift checking (replay protection).
  - Idempotency & duplicate event ID tracking (mencegah double ledger/double credit).
- **Concurrency & Race Conditions Handling**:
  - Key-based mutex locks per `paymentId` (`withLock`) mencegah konflik antara cancel dan webhook success.
  - Atomic serialization untuk webhook concurrent arrival (`Promise.all`).
- **Otorisasi & RBAC**:
  - Passenger hanya dapat melihat pembayaran milik sendiri (`payerId === user.id`).
  - Driver hanya dapat melihat pembayaran terkait ordernya (`payeeDriverId === user.id`).
  - Admin memiliki akses audit penuh ke seluruh riwayat pembayaran.

---

## 2. Status Modul Phase 6A (Payment & Double-Entry Ledger)
- **Database Migration (`database/migrations/006_payment_and_ledger.sql`)**:
  - `payments`: IDR integer Rupiah, `ride_id` UNIQUE, `idempotency_key` UNIQUE, status PENDING s/d REFUNDED, method CASH / DIGITAL, provider abstraction.
  - `ledger_accounts`: DRIVER_PAYABLE, PLATFORM_REVENUE, PAYMENT_CLEARING, CASH_RECEIVABLE, REFUND_PAYABLE.
  - `ledger_transactions` & `ledger_entries`: Double-entry balanced constraint `SUM(debit) = SUM(credit)`, no negative debit/credit.
  - `payment_split_configs`: Default 85.00% Driver / 15.00% Platform, dinamis & dapat dikonfigurasi.
- **Double-Entry Ledger Engine (`backend/src/payment/ledger.service.ts`)**:
  - Validasi ketat keseimbangan akuntansi `SUM(debit) === SUM(credit)`.
  - Pencegahan transaksi duplikat via referensi unik.
  - Perhitungan saldo buku besar per jenis akun (`DRIVER_PAYABLE`, `PLATFORM_REVENUE`, dll.).
- **Payment Service (`backend/src/payment/payment.service.ts`)**:
  - Idempotent payment processing (duplicate request returns existing record).
  - Integritas 1 ride = 1 payment record (duplicate payment rejected).
  - Validasi kelayakan ride: Hanya order `COMPLETED` yang dapat dibayar (incomplete ride rejected).
  - Validasi nominal IDR bulat (integer), penolakan nominal nol atau negatif.
  - Transaksi atomik dengan rollback otomatis jika pencatatan ledger gagal.
- **Provider Abstraction (`backend/src/payment/payment-provider.interface.ts`)**:
  - Interface `PaymentProvider` (`createPayment`, `getPaymentStatus`, `verifyWebhook`, `refundPayment`).
  - Terisolasi dari vendor spesifik dengan `MockPaymentProvider` untuk dev/test.

---

## 3. Hasil Automated Test Phase 6A
12 / 12 Test Cases Lolos (100% Passed) (`backend/test/phase6a-payment-ledger.spec.ts`):
- `TEST 1: payment creation`
- `TEST 2: duplicate payment rejected`
- `TEST 3: IDR amount (integer Rupiah)`
- `TEST 4: ledger balance (SUM(debit) === SUM(credit))`
- `TEST 5: 85/15 split (dan rekonfigurasi dinamis)`
- `TEST 6: zero amount rejected`
- `TEST 7: negative amount rejected`
- `TEST 8: completed ride payment`
- `TEST 9: incomplete ride rejected`
- `TEST 10: duplicate ledger transaction rejected`
- `TEST 11: balanced debit/credit constraint`
- `TEST 12: database transaction rollback`

---

## 2. Status Modul Phase 5B
- **Driver Eligibility Filter**: `DriverEligibilityService` memverifikasi secara ketat (role DRIVER, APPROVED, 4 dokumen lengkap & tidak expired, kendaraan aktif, ONLINE, GPS FRESH < 10s).
- **Nearby Driver Discovery**: Terintegrasi penuh dengan `GeospatialService` Phase 4 (radius 1500m, Redis GEO prioritas, PostGIS fallback).
- **Ranking Engine**: 4 parameter berjenjang deterministik (ETA -> Distance -> GPS Freshness -> Idle duration).
- **Dispatch Offer Lifecycle**: Jendela respon 30 detik. Reject/Timeout otomatis mengalihkan offer ke kandidat berikutnya. Order tetap `SEARCHING` jika kandidat habis.
- **Concurrency & Atomic Locking**: Mengunci armada agar terhindar dari kondisi race condition di mana 2 order mendapatkan driver yang sama. Double-accept dicegah via optimistic lock `version`.
- **Driver Transition API**: `POST /rides/:id/accept`, `reject`, `dispatch/timeout`, `arrived`, `start`, `complete`, `cancel`.
- **Audit Dispatch Log**: Tabel `ride_dispatch_attempts` mencatat setiap tawaran (OFFERED, ACCEPTED, REJECTED, TIMEOUT).

---

## 3. Hasil Automated Test Phase 5B
20 / 20 Test Suites Lolos (100% Passed):
- `TEST 1: only eligible drivers matched`
- `TEST 2: stale driver excluded`
- `TEST 3: expired driver excluded`
- `TEST 4: offline driver excluded`
- `TEST 5: unapproved driver excluded`
- `TEST 6: inactive vehicle excluded`
- `TEST 7: driver already on active ride excluded`
- `TEST 8: radius filtering excludes driver beyond 1500m`
- `TEST 9: closest driver ranking breaks tie when ETA is identical`
- `TEST 10: ETA ranking places faster arrival candidate at rank #1`
- `TEST 11: reject -> offer immediately moves to next driver`
- `TEST 12: timeout -> offer transitions to next candidate driver`
- `TEST 13: no driver available -> ride remains SEARCHING without cancelling`
- `TEST 14: concurrent assignment protection guarantees only one ride wins driver`
- `TEST 15: double accept rejected with HTTP 409 Conflict`
- `TEST 16: invalid state transition rejected`
- `TEST 17: unauthorized driver rejected from accepting an offer assigned to another`
- `TEST 18: customer cannot manipulate driver assignment`
- `TEST 19: completed ride cannot restart or transition backwards`
- `TEST 20: cancelled ride cannot restart or transition to another state`
