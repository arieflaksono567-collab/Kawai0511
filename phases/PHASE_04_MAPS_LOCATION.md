# PHASE 4 — MAPS & LOCATION SYSTEM

## Deskripsi
Infrastruktur geospasial real-time dan manajemen koordinat armada KAWAI 0511 (Banjarmasin - 0511):
- **Database Spasial**: PostgreSQL 16 + PostGIS dengan tipe `GEOGRAPHY(POINT, 4326)` & index GiST
- **Real-Time GPS Tracking**: Stream lokasi pengemudi melalui `POST /drivers/me/location`
- **Location Freshness Engine**:
  - `FRESH`: < 10 detik (Siap menerima dispatch order)
  - `STALE`: 10 - 30 detik (Memerlukan heartbeat GPS baru)
  - `EXPIRED`: > 30 detik (Otomatis didiskualifikasi dari pencarian order)
- **Redis GEO & Caching**: Performa tinggi `GEOADD` dan `GEOSEARCH` dalam radius 1.5 km Kota Banjarmasin
- **Geocoding & POI Banjarmasin**: Resolusi alamat Duta Mall, Siring Martapura, RSUD Ulin, ULM Kayu Tangi, Trisakti, Sabilal Muhtadin, Km 6
- **Routing Engine Abstraction**: Perhitungan jarak meter dan estimasi waktu tempuh tanpa kalkulasi tarif (Strict Zero-Fare Rule pada Phase 4)

## Acceptance Tests
15/15 Acceptance tests lulus 100%.

## Status
**STATUS**: COMPLETE (FROZEN)
