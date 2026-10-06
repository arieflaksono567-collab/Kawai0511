# KAWAI 0511 — Changelog

Semua perubahan pada repositori KAWAI 0511 dicatat secara kronologis berdasarkan implementasi aktual.

---

## [Phase 5] - 2026-10-06
### Added
- **Database Migrasi `database/migrations/005_ride_ordering.sql`**:
  - Tabel `rides` dengan kolom `version` (optimistic lock), snapshot tarif `fare_snapshot`, rute, dan status lifecycle.
  - Tabel `ride_state_logs` untuk audit trail setiap transisi status.
  - Tabel `ride_dispatch_attempts` untuk log penawaran armada.
- **Backend Ride Module (`/backend/src/ride/`)**:
  - `FareService`: Mesin kalkulasi tarif resmi KAWAI 0511 (Tarif dasar Rp 7.000, Rp 2.200/km, Rp 200/menit, batas minimum Rp 10.000, zero surge, zero payment).
  - `RideDispatchService`: Orkestrasi pencocokan armada terdekat dalam radius 1,5 km, memfilter hanya driver dengan GPS `FRESH` (< 10 detik), verifikasi kelayakan Phase 3 `APPROVED` & `ONLINE`, dan proteksi driver tidak sedang melayani order lain.
  - `RideService`: Pengendali state machine berurutan (`SEARCHING` -> `ASSIGNED` -> `ARRIVED` -> `IN_TRIP` -> `COMPLETED`), proteksi *double-accept* (409 Conflict), dan pencegahan pembatalan saat `IN_TRIP` atau `COMPLETED`.
  - `RideController`: Endpoints terproteksi JWT & RBAC (`POST /rides/order`, `GET /rides/:id`, `GET /rides/my`, `POST /rides/:id/accept`, `POST /rides/:id/arrived`, `POST /rides/:id/start`, `POST /rides/:id/complete`, `POST /rides/:id/cancel`, `GET /rides/:id/logs`).
- **Dev Runtime Middleware Sync (`vite.config.ts`)**:
  - Sinkronisasi endpoint `/rides/order`, `/rides/my`, `/rides/:id`, transisi accept/arrived/start/complete/cancel pada port 3000.
- **Frontend Web Cockpit (`src/App.tsx`)**:
  - Tab "Pemesanan & Trip Lifecycle (Phase 5)" dengan form penjemputan, breakdown tarif otomatis, stepper status pemesanan interaktif, dan tombol transisi.
- **Test Suite**:
  - `backend/test/phase5-acceptance.spec.ts`: 15 skenario acceptance tests (100% Passed).

---

## [Phase 4] - 2026-10-06
### Added
- Database Spasial PostgreSQL 16 + PostGIS (`driver_locations`, `landmarks`, trigger geometri).
- Modul `backend/src/location/` (`LocationService`, `LocationFreshnessService`, `RedisGeoService`, `GeocodingService`, `RoutingService`, `GeospatialService`).
- Endpoints lokasi dan geospasial Kota Banjarmasin.
- 15 acceptance tests Phase 4.

---

## [Phase 3] - 2026-10-05
### Added
- Tabel `drivers`, `driver_documents`, `vehicles`, `audit_logs`.
- `DriverEligibilityService` dan verifikasi KYC mitra pengemudi.
- 20 acceptance tests Phase 3.

---

## [Phase 2] - 2026-10-04
### Added
- Normalisasi nomor telepon (+62 format) dan layanan OTP aman.
- JWT Access Token & Refresh Token Rotation.
- Centralized RBAC dan 12 acceptance tests Phase 2.

---

## [Phase 1] - 2026-10-03
### Added
- Inisialisasi struktur repositori monorepo KAWAI 0511 dan Docker Compose.
