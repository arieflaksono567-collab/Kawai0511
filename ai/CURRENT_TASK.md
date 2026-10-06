# KAWAI 0511 — Current Task

- **Current Completed Phase**: Phase 5 (Ride Ordering & Dispatch — Fare Engine, Candidate Matching, Strict State Machine, Optimistic Locking)
- **Active Accomplishments**:
  1. **Database Migration**: `005_ride_ordering.sql` (`rides`, `ride_state_logs`, `ride_dispatch_attempts`).
  2. **Fare Calculation Engine**:
     - `FareService` mengimplementasikan formula resmi Phase 5:
       * Base Fare: Rp 7.000
       * Per Km: Rp 2.200
       * Per Menit: Rp 200
       * Minimum Fare: Rp 10.000
     - Configurable, zero surge, zero payment.
  3. **Driver Dispatch & Candidate Matching Engine**:
     - `RideDispatchService`: Radius 1.5 km, filter GPS `FRESH` < 10 detik, filter Phase 3 `APPROVED` & `ONLINE`, filter konkurensi (tidak sedang dalam trip aktif).
  4. **Strict State Machine & Optimistic Locking**:
     - `SEARCHING` -> `ASSIGNED` -> `ARRIVED` -> `IN_TRIP` -> `COMPLETED`.
     - Version lock (`version` column) mencegah double-accept (HTTP 409 Conflict).
     - Pembatalan terproteksi: dilarang membatalkan order saat `IN_TRIP` atau `COMPLETED`.
     - Audit State Trail (`ride_state_logs`).
  5. **Endpoints**:
     - `POST /rides/order`
     - `GET /rides/:id`
     - `GET /rides/my`
     - `POST /rides/:id/accept`
     - `POST /rides/:id/arrived`
     - `POST /rides/:id/start`
     - `POST /rides/:id/complete`
     - `POST /rides/:id/cancel`
     - `GET /rides/:id/logs`
  6. **Acceptance Test Suite**:
     - 15/15 Acceptance tests passed (`backend/test/phase5-acceptance.spec.ts`).
- **Next Phase**: Phase 6 (Payment & Wallet — KawaiPay, Top up, Penarikan, Split Komisi).
- **Status**: STOPPED — Phase 5 COMPLETE & FROZEN. Awaiting user command to proceed to Phase 6.
