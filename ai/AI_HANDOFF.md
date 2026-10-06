# KAWAI 0511 — AI Handoff Document

> **Dokumen Transisi & Konteks AI (Updated: Phase 5 Complete)**  
> Dokumen ini mencatat kondisi arsitektur, implementasi nyata, dependensi, dan batasan teknis saat ini pada repository KAWAI 0511.

---

## 1. Identitas Proyek & Konteks Regional
- **Nama Platform**: KAWAI 0511 (Aplikasi Super-App Transportasi, Pengantaran, dan Logistik Lokal)
- **Wilayah Operasional**: Kota Banjarmasin, Kalimantan Selatan (Kode Wilayah: 0511)
- **Arsitektur**: Monorepo terstruktur (Backend NestJS + Frontend Web Cockpit Tailwind React + Flutter App Stubs)
- **Basis Data Target**: PostgreSQL 16 + PostGIS (Spasial) + Redis (Cache Spasial/PubSub)

---

## 2. Status Implementasi Aktual (Kondisi Repository Riil)

### A. PHASE 1 — Project Foundation [FROZEN]
- Monorepo folder layout (`apps/`, `backend/`, `database/`, `ai/`, `phases/`).
- Docker Compose configuration (`docker-compose.yml`) dengan PostGIS dan Redis.
- Skema dasar basis data (`001_initial_foundation.sql`).

### B. PHASE 2 — Authentication & User System [FROZEN]
- Normalisasi nomor telepon format Indonesia E.164 (`+62xxxxxxxxxxx`) via `phone.util.ts`.
- Layanan OTP aman (5x percobaan, 5 menit expiry, 60s cooldown).
- Dual token: JWT Access Token (15 menit) + Refresh Token Rotation (30 hari).
- Centralized RBAC: `CUSTOMER`, `DRIVER`, `ADMIN`.
- 12/12 Acceptance tests terverifikasi.

### C. PHASE 3 — Driver System & KYC Verification [FROZEN]
- Pemisahan identitas pengguna (`users.id`) dengan profil pengemudi (`drivers.id`).
- Manajemen dokumen KYC: KTP, SIM C, STNK, dan SKCK via `LocalDocumentStorageProvider`.
- Pendaftaran kendaraan motor plat `DA ...`.
- `DriverEligibilityService`: Hanya driver `APPROVED` dengan 4 berkas valid + kendaraan disetujui yang dapat `ONLINE`.
- 20/20 Acceptance tests terverifikasi.

### D. PHASE 4 — Maps & Location System [FROZEN]
- **PostgreSQL 16 + PostGIS**: Tabel `driver_locations` (`GEOGRAPHY(POINT, 4326)`), spatial GiST index (`004_maps_and_location.sql`).
- **Driver GPS Broadcast**: Endpoint `POST /drivers/me/location` dengan validasi bounds fisik, proteksi paket out-of-order, dan rate limit 60 req/min.
- **Location Freshness Engine**: `FRESH` (< 10 detik), `STALE` (10-30 detik), `EXPIRED` (> 30 detik).
- **Redis GEO**: `GEOADD` & `GEOSEARCH` dalam radius 1.5 km Kota Banjarmasin dengan fallback PostGIS.
- **Geocoding & POI Banjarmasin**: Resolusi alamat koordinat dan pencarian landmark kunci (Duta Mall, Siring, RSUD Ulin, ULM, Trisakti, Sabilal Muhtadin, Km 6).
- **Routing Engine Abstraction**: Perhitungan jarak jalan dan durasi motor (Strict Zero-Fare Rule).
- 15/15 Acceptance tests terverifikasi.

### E. PHASE 5 — Ride Ordering & Dispatch [FROZEN / COMPLETED]
- **Database Migrasi**: `005_ride_ordering.sql` (`rides`, `ride_state_logs`, `ride_dispatch_attempts`).
- **Fare Calculation Engine (`FareService`)**:
  - Tarif Dasar: Rp 7.000
  - Tarif per Kilometer: Rp 2.200
  - Tarif per Menit: Rp 200
  - Batas Minimum: Rp 10.000
  - Formula: `rawFare = 7000 + (distKm * 2200) + (durMin * 200)`, `totalFare = max(rawFare, 10000)`.
  - Zero payment, zero surge multiplier pada Phase 5.
- **Candidate Matching Engine (`RideDispatchService`)**:
  - Radius 1.5 km via Redis GEO & PostGIS.
  - Filter GPS `FRESH` (< 10 detik).
  - Filter Phase 3 `APPROVED` & `ONLINE` via `DriverEligibilityService`.
  - Filter konkurensi: Driver tidak sedang melayani order aktif lain.
- **Strict State Machine & Optimistic Locking (`RideService`)**:
  - `SEARCHING` $\rightarrow$ `ASSIGNED` $\rightarrow$ `ARRIVED` $\rightarrow$ `IN_TRIP` $\rightarrow$ `COMPLETED`.
  - Kolom `version` menjamin proteksi *double-accept* (HTTP 409 Conflict).
  - Pembatalan legal dari `SEARCHING`, `ASSIGNED`, `ARRIVED`.
  - Pembatalan dilarang saat `IN_TRIP` atau `COMPLETED`.
  - Audit state logs (`ride_state_logs`).
- **Endpoints**:
  - `POST /rides/order`, `GET /rides/:id`, `GET /rides/my`, `POST /rides/:id/accept`, `POST /rides/:id/arrived`, `POST /rides/:id/start`, `POST /rides/:id/complete`, `POST /rides/:id/cancel`, `GET /rides/:id/logs`.
- 15/15 Acceptance tests terverifikasi (`backend/test/phase5-acceptance.spec.ts`).

---

## 3. Hasil Pengujian (*Test Results*)
- **Total Acceptance Tests**: **62 / 62 PASSED (100%)**
  - Phase 2: 12 tests
  - Phase 3: 20 tests
  - Phase 4: 15 tests
  - Phase 5: 15 tests
- **TypeScript Static Check**: `tsc --noEmit` 0 error.
- **Production Bundle Build**: `vite build` 0 error.

---

## 4. Panduan untuk AI Berikutnya (*Instruction for Next AI Step*)
- Status proyek saat ini adalah **STOPPED** pada Phase 5.
- Jangan mengulang atau membongkar Phase 1 s/d Phase 5.
- Jika pengguna meminta melanjutkan ke **PHASE 6 (PAYMENT & WALLET)**:
  - Bangun dompet digital KawaiPay, transaksi topup saldo, penarikan bank (withdrawal), serta pembagian komisi bagi hasil 85% mitra driver / 15% platform berdasarkan `total_fare` order yang telah berstatus `COMPLETED` di Phase 5.
