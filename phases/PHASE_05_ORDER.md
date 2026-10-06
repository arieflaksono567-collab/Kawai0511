# PHASE 5 — RIDE ORDERING & DISPATCH

## Deskripsi
Manajemen siklus hidup pemesanan perjalanan, mesin kalkulasi tarif (*Fare Engine*), pencocokan mitra pengemudi terdekat (*Driver Matching*), dan mesin status bertahap (*Strict Order State Machine*) KAWAI 0511 (Banjarmasin - 0511):
- **Database Skema**: Tabel `rides`, `ride_state_logs`, dan `ride_dispatch_attempts` pada migrasi `005_ride_ordering.sql`.
- **Fare Engine Resmi**:
  - Tarif Dasar (*Base Fare*): Rp 7.000
  - Tarif per Kilometer (*Per Km*): Rp 2.200
  - Tarif per Menit (*Per Minute*): Rp 200
  - Batas Tarif Minimum (*Minimum Fare*): Rp 10.000
  - Rumus: `totalFare = max(baseFare + distKm * perKm + durMin * perMin, minFare)`
- **Driver Matching & Dispatch Engine**:
  - Radius pencarian armada: 1.500 meter (1,5 km) via Redis GEO & PostGIS.
  - Filter Kesegaran GPS: HANYA driver dengan status `FRESH` (< 10 detik).
  - Filter Kelayakan Phase 3: Wajib verifikasi `APPROVED`, 4 berkas KYC sah, kendaraan aktif, dan status operasional `ONLINE`.
  - Filter Konkurensi: Driver tidak sedang dalam perjalanan aktif (`status NOT IN ('ASSIGNED', 'ARRIVED', 'IN_TRIP')`).
- **Strict Order State Machine**:
  - `SEARCHING` $\rightarrow$ `ASSIGNED` $\rightarrow$ `ARRIVED` $\rightarrow$ `IN_TRIP` $\rightarrow$ `COMPLETED`
  - Pembatalan legal dari status `SEARCHING`, `ASSIGNED`, atau `ARRIVED` ke `CANCELLED`.
  - Pembatalan dilarang keras saat status `IN_TRIP` atau `COMPLETED`.
- **Optimistic Concurrency Control**:
  - Kolom `version` menjamin proteksi terhadap *double-accept* (409 Conflict).

## Acceptance Tests
15/15 Acceptance tests lulus 100% (`backend/test/phase5-acceptance.spec.ts`).

## Status
**STATUS**: COMPLETE (FROZEN)
