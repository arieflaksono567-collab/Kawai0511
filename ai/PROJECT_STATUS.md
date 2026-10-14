# KAWAI 0511 — Project Status & Roadmap

> **CATATAN REKONSILIASI KANONIS**: Sumber status resmi dan tunggal (Single Source of Truth / SSOT) untuk seluruh fase (Phase 0 s.d. Phase 10), hasil pengujian aktual, dan audit keamanan terletak di **`.ai/PROJECT_STATUS.md`**. Dokumen ini dipertahankan sebagai arsip historis status implementasi Phase 5B.


## 1. Tabel Ringkasan Fase

| Phase | Nama Fase | Status | Tanggal Selesai | Keterangan & Pencapaian Utama |
|---|---|---|---|---|
| **Phase 1** | Foundation & Project Setup | **COMPLETE / FROZEN** | 2026-10-06 | Monorepo structure, Docker PostGIS & Redis, skema migrasi awal. |
| **Phase 2** | Auth & Identity | **COMPLETE / FROZEN** | 2026-10-06 | JWT Auth, nomor HP E.164 (+62), OTP rate limiter, Role RBAC. |
| **Phase 3** | Driver Onboarding & KYC | **COMPLETE / FROZEN** | 2026-10-06 | 4 Dokumen verifikasi, registrasi kendaraan, status operasional ONLINE/OFFLINE. |
| **Phase 4** | Location & Geospatial Engine | **COMPLETE / FROZEN** | 2026-10-06 | Redis GEO, PostGIS fallback, Haversine, Freshness (FRESH/STALE/EXPIRED). |
| **Phase 5A**| Ride Ordering & State Machine | **COMPLETE / FROZEN** | 2026-10-06 | Fare engine Banjarmasin, order lifecycle state machine, audit logs. |
| **Phase 5B**| Driver Matching & Dispatch | **COMPLETE / FROZEN** | 2026-10-07 | Radius 1500m, deterministic ranking, 30s timeout, reject/timeout cascades, atomic assignment. |
| **Phase 6** | Payment, Wallet & Revenue Split | *NEXT* | - | KawaiPay, 85% Driver / 15% Platform commission split, balance ledger. |
| **Phase 7** | Real-time Tracking & WebSocket | *PLANNED* | - | WebSocket Gateway, live telemetry, subscriber map updates. |
| **Phase 8** | Customer Rating & Reviews | *PLANNED* | - | Rating 1-5 bintang, tips, evaluasi performa mitra. |

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
