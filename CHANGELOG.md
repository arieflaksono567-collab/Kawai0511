# KAWAI 0511 — Changelog

Semua perubahan pada repositori KAWAI 0511 dicatat secara kronologis berdasarkan implementasi aktual.

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
