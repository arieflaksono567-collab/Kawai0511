# KAWAI 0511 — Changelog

Semua perubahan pada repositori KAWAI 0511 dicatat secara kronologis berdasarkan implementasi aktual.

---

## [Phase 4] - 2026-10-06
### Added
- **Database Spasial PostgreSQL 16 + PostGIS**:
  - Berkas migrasi `database/migrations/004_maps_and_location.sql`.
  - Tabel `driver_locations` dengan tipe native `GEOGRAPHY(POINT, 4326)`.
  - Indeks spasial `idx_driver_locations_geo` (GiST) dan index komposit `(driver_id, recorded_at DESC)`.
  - Trigger `update_driver_location_geom()` untuk sinkronisasi otomatis kolom geometri dari latitude dan longitude.
  - Tabel `landmarks` dan seed data 7 landmark utama Kota Banjarmasin (Duta Mall, Menara Pandang Siring Martapura, RSUD Ulin, ULM Kayu Tangi, Pelabuhan Trisakti, Masjid Raya Sabilal Muhtadin, Terminal Km 6).
- **Backend Location & Geospatial Module (`/backend/src/location/`)**:
  - `LocationService`: Validasi koordinat fisik (lat [-90..90], lng [-180..180], akurasi >= 0, heading 0..360, baterai 0..100%), pembatasan laju transmisi (rate limit max 60 req/menit per driver), dan proteksi out-of-order timestamp.
  - `LocationFreshnessService`: Mesin evaluasi kesegaran GPS dengan tiga tingkatan: `FRESH` (< 10 detik), `STALE` (10 - 30 detik), dan `EXPIRED` (> 30 detik).
  - `RedisGeoService`: Implementasi abstraksi cache spasial `GEOADD`, `GEOSEARCH`, dan metadata store dengan proteksi failure resilience & fallback.
  - `GeocodingService`: Mesin penerjemah koordinat ke hierarki alamat lengkap Kota Banjarmasin serta pencarian teks bebas untuk POI/Landmark.
  - `RoutingService`: Layanan estimasi jarak jalan raya (koefisien perkotaan 1.25x) dan durasi tempuh sepeda motor (~25 km/jam) dengan kepatuhan mutlak **Zero-Fare Rule** (tanpa logika tarif sebelum Phase 5).
  - `GeospatialService`: Pencarian driver terdekat dalam radius meter (default 1500m) dengan filter diskualifikasi driver berstatus `EXPIRED`.
  - `LocationController`: Expose REST API endpoint dengan guard autentikasi `JwtAuthGuard` dan `RolesGuard`.
- **API Endpoints**:
  - `POST /drivers/me/location`
  - `GET /drivers/me/location`
  - `GET /drivers/me/location/status`
  - `GET /locations/nearby-drivers`
  - `GET /locations/reverse-geocode`
  - `GET /locations/search`
  - `GET /locations/route`
  - `GET /admin/drivers/locations`
  - `GET /health` (diperbarui ke status Phase 4)
- **Frontend Interactive Cockpit (`src/App.tsx`)**:
  - Peta Interaktif Kota Banjarmasin dengan visualisasi aliran sungai Barito, Martapura, koridor Jl. A. Yani, Jl. Hasan Basry, dan pin landmark.
  - Simulator Driver GPS Stream Broadcaster dengan telemetry gauge, coordinate sliders, dan tombol auto-streaming 4 detik.
  - Panel Radar Armada Terdekat dengan pilihan radius fleksibel (500m, 1000m, 1500m, 3000m, 5000m).
  - Inspektor Reverse Geocoding interaktif pada setiap klik di peta.
  - Alat kalkulasi jarak rute dan durasi perjalanan.
  - Runner uji otomatis untuk 15 skenario acceptance tests.
  - Konsol REST API explorer terintegrasi.
- **Test Suites**:
  - `backend/test/phase4-acceptance.spec.ts`: 15 acceptance test scenarios (100% Passed).
  - `backend/test/haversine-freshness.spec.ts`: Unit tests untuk fungsi geodesik dan batas kesegaran waktu.

### Fixed
- Memperbaiki galat kompilasi TypeScript TS5102 pada `backend/tsconfig.json` akibat penghapusan opsi `baseUrl` pada TypeScript 7; digantikan dengan pemetaan path modern `"paths": { "*": ["./*"] }`.
- Menambahkan konfigurasi eksplisit `include: ["src/**/*"]` dan `exclude: ["node_modules", "dist", "test"]` pada `backend/tsconfig.json` untuk menjaga kebersihan kompilasi dari tipe tes ambien.

---

## [Phase 3] - 2026-10-05
### Added
- Tabel basis data `drivers`, `driver_documents`, `vehicles`, dan `audit_logs` pada `003_driver_system.sql`.
- Abstraksi penyimpanan berkas dokumen `DocumentStorageProvider` dan implementasi `LocalDocumentStorageProvider`.
- Centralized `DriverEligibilityService` sebagai sumber kebenaran status kelayakan online driver (wajib 4 berkas APPROVED + kendaraan aktif APPROVED).
- Endpoint driver: `GET /drivers/me`, `PATCH /drivers/me`, `GET /drivers/me/documents`, `POST /drivers/me/documents`, `GET /drivers/me/vehicles`, `POST /drivers/me/vehicles`, `GET /drivers/me/eligibility`, `GET /drivers/me/status`, `POST /drivers/me/status/online`, `POST /drivers/me/status/offline`.
- Endpoint admin: `GET /admin/drivers`, `GET /admin/drivers/:id`, approval/rejection dokumen, approval kendaraan, serta suspensi akun.
- Test suites: unit test kelayakan `driver-eligibility.spec.ts` dan 20 skenario acceptance tests `phase3-acceptance.spec.ts`.

---

## [Phase 2] - 2026-10-04
### Added
- Utility normalisasi nomor telepon `normalizePhoneNumber()` (+62 Indonesia format).
- Abstraksi `OtpProvider` dan implementasi `MockOtpProvider`.
- Tabel basis data `otp_codes` dan `refresh_tokens`.
- JWT Access Token (15 menit) dan Refresh Token Rotation (30 hari).
- Centralized RBAC: `RolesGuard`, `JwtAuthGuard`, `@Roles()`.
- Endpoint `POST /auth/request-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Endpoint `GET /users/me`, `PATCH /users/me`.
- Test suite: unit tests dan 12 acceptance tests.

---

## [Phase 1] - 2026-10-03
### Added
- Inisialisasi struktur repositori monorepo KAWAI 0511.
- Konfigurasi `docker-compose.yml` untuk PostgreSQL 16 PostGIS dan Redis.
- Setup template modul NestJS dan migrasi fondasi awal `001_initial_foundation.sql`.
