# KAWAI 0511 — AI Handoff Document

> **CATATAN REKONSILIASI KANONIS**: Sumber status resmi dan tunggal (Single Source of Truth / SSOT) untuk seluruh fase (Phase 0 s.d. Phase 10), hasil pengujian aktual, dan audit keamanan terletak di **`.ai/PROJECT_STATUS.md`**. Dokumen ini dipertahankan sebagai arsip historis konteks Phase 5B.


## 1. Identitas Proyek & Status Terkini
- **Nama Repository**: KAWAI 0511 (Aplikasi Ride-Hailing Kota Banjarmasin, Kalimantan Selatan)
- **Status Fase**:
  - Phase 1 (Project Foundation): **FROZEN**
  - Phase 2 (Authentication & User System): **FROZEN**
  - Phase 3 (Driver Management & Verification): **FROZEN**
  - Phase 4 (Geospatial & Location Engine): **FROZEN**
  - Phase 5A (Ride Ordering & State Machine): **FROZEN**
  - Phase 5B (Driver Matching & Dispatch Engine): **COMPLETE / FROZEN**
- **Boundary**:
  - Dilarang membongkar / refactor besar arsitektur Phase 1 s/d Phase 4.
  - Phase 5B berfokus pada integrasi Driver Matching, Radar Radius 1500m, Multi-criteria Ranking deterministik, 30s Dispatch Offer, Atomic Assignment & Concurrency Lock, State Transitions, dan Dispatch Attempt Logging.
  - Jangan implementasikan Payment, Wallet, KawaiPay, QRIS, Food, Send, Chat, FCM, SOS, atau Surge Pricing (direncanakan untuk fase berikutnya).

---

## 2. Implementasi Aktual Phase 5B

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
