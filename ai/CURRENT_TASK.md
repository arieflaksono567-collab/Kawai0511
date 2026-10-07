# KAWAI 0511 — Current Task

- **Current Completed Phase**: Phase 5B (Driver Matching & Dispatch — Deterministic Ranking, 30s Offer Timeout, Reject/Timeout Escalation, Concurrency Locking)
- **Active Accomplishments**:
  1. **Database Migration**: `005_ride_ordering.sql` (`rides`, `ride_state_logs`, `ride_dispatch_attempts` dengan metrik `attempt_number`, `distance_meters`, `eta_seconds`, `status`, `offered_at`, `responded_at`).
  2. **Driver Eligibility Enforcement**:
     - Memverifikasi Role DRIVER, Driver `APPROVED`, 4 berkas KYC (KTP, SIM_C, STNK, SKCK) `APPROVED` & belum `EXPIRED`.
     - Kendaraan aktif `APPROVED`.
     - Operational status `ONLINE`.
     - GPS status `FRESH` (< 10 detik). Driver `STALE` dan `EXPIRED` otomatis ditolak.
     - Driver tidak sedang dalam order aktif lain.
  3. **Geospatial & Search Radius**:
     - Radius 1500 meter Kota Banjarmasin berbasis Redis GEO dan PostGIS fallback (Phase 4).
  4. **Deterministic Candidate Ranking**:
     - 1. ETA pickup (tercepat menang)
     - 2. Jarak pickup (terdekat menang jika ETA sama)
     - 3. GPS freshness (paling baru menang jika jarak sama)
     - 4. Idle duration (driver idle lebih lama menang jika GPS age sama)
     - 5. DriverId tie-breaker
  5. **Dispatch Offer Lifecycle & Timeout 30 Detik**:
     - Penawaran dikirim ke kandidat ranking #1 selama 30 detik.
     - Penolakan (`POST /rides/:id/reject`) atau timeout (`POST /rides/:id/dispatch/timeout`) secara otomatis mengalihkan offer ke kandidat berikutnya.
     - Jika seluruh armada habis, order tetap dalam status `SEARCHING` (tidak dibatalkan otomatis).
  6. **Concurrency Protection**:
     - Atomic driver lock mencegah race condition saat dua penumpang mencari driver bersamaan.
     - Double accept dicegah via version lock (`version` column) melempar HTTP 409 Conflict.
     - Driver tidak sah ditolak saat mencoba menerima order driver lain (HTTP 403 Forbidden).
  7. **Acceptance Test Suite**:
     - 20 / 20 Acceptance tests passed (`backend/test/phase5-acceptance.spec.ts` & `backend/test/run-phase5-tests.ts`).
- **Next Phase**: Phase 6 (Payment & Wallet — KawaiPay, Top up, Penarikan, Split Komisi).
- **Status**: STOPPED — PHASE 5B COMPLETE.
