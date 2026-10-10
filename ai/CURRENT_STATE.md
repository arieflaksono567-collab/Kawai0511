# KAWAI 0511 — Current State

> Status Terkini: **Phase 7.2 Complete & Validated** (Rating System: Passenger & Driver Feedback Engine)  
> Terakhir diperbarui: 2026-10-10

---

## 1. Ringkasan Status Proyek

| Fase | Nama Modul | Status | Keterangan |
|---|---|---|---|
| **Phase 1** | Foundation & Project Setup | **FROZEN** | Monorepo structure, Docker PostGIS, Redis. |
| **Phase 2** | Auth & Identity | **FROZEN** | Nomor HP E.164 (+62), OTP abstraction, JWT, RBAC (`CUSTOMER`, `DRIVER`, `ADMIN`). |
| **Phase 3** | Driver Onboarding & KYC | **FROZEN** | 4 Berkas KYC, kendaraan, status ONLINE/OFFLINE, admin verification. |
| **Phase 4** | Location & Geospatial Engine | **FROZEN** | Redis GEO, PostGIS fallback, Haversine, freshness (FRESH/STALE/EXPIRED). |
| **Phase 5A**| Ride Ordering & Fare Engine | **FROZEN** | Fare engine Banjarmasin, order lifecycle state machine, audit logs. |
| **Phase 5B**| Driver Matching & Dispatch | **FROZEN** | Radius 1500m, ranking deterministik, timeout 30s, atomic concurrency lock. |
| **Phase 6A**| Payment & Double-Entry Ledger | **FROZEN** | Tabel payments, ledger accounts, transactions, entries, split config. |
| **Phase 6B**| Payment Service & Webhook Security | **FROZEN** | Cash & Digital mock provider, HMAC-SHA256, replay protection, mutex lock. |
| **Phase 6C**| Settlement & Driver Earnings | **FROZEN** | 8-step atomic settlement, ledger-authoritative driver earnings. |
| **Phase 7.1**| Database Foundation (Rating, Earnings, History) | **FROZEN** | Skema tabel `ride_ratings`, `driver_earnings_ledger`, composite indexes, view `view_trip_history_details`, repository & authorization scoping. |
| **Phase 7.2**| Rating System (Passenger & Driver) | **COMPLETE / VALIDATED** | Endpoint `POST /rides/:id/rating` & `POST /ratings`, validasi status COMPLETED, proteksi double rating, self-rating rejection, driver rating aggregation. |
| **Phase 7.3**| Historical Trips & Earnings Breakdown API | *NEXT* | Paginated history endpoint, composite view integration, driver trip breakdown. |

---

## 2. Pencapaian Phase 7.2 (Rating System)

1. **Dua Arah Penilaian (Two-Way Rating System)**:
   - **Passenger $\rightarrow$ Driver**: Penumpang memberikan rating bintang 1–5, ulasan komentar opsional, tag feedback, dan tip opsional setelah status perjalanan `COMPLETED`.
   - **Driver $\rightarrow$ Passenger**: Mitra driver memberikan rating bintang 1–5, komentar opsional, dan tag umpan balik kepada penumpang setelah perjalanan `COMPLETED`.

2. **Aturan Validasi & Integritas Bisnis (Strict Business Rules)**:
   - **Score 1–5**: Skor penilaian wajib berada di antara 1 dan 5 (skor < 1, > 5, negatif, atau NaN ditolak keras dengan `BadRequestException`).
   - **Comment Opsional**: Komentar teks tidak wajib diisi.
   - **Status COMPLETED Only**: Penilaian pada order berstatus `SEARCHING`, `ASSIGNED`, `ARRIVED`, `IN_TRIP`, atau `CANCELLED` ditolak (`BadRequestException`).
   - **Relationship Verification**: Hanya penumpang atau driver yang tercatat pada order perjalanan yang diizinkan memberi rating; pihak ketiga / user lain ditolak (`ForbiddenException` HTTP 403).
   - **Satu Reviewer = Satu Rating**: Satu pihak hanya dapat menilai satu kali per perjalanan. Percobaan pengiriman rating kedua ditolak (`ConflictException` HTTP 409).
   - **Pencegahan Self-Rating**: Reviewer dan Reviewed User tidak boleh sama; user tidak dapat menilai dirinya sendiri (`BadRequestException` HTTP 400).
   - **Server-Side Identity Trust**: Identitas reviewer dan reviewed user ditentukan secara eksklusif dari authenticated JWT context (`req.user`) dan data order perjalanan, mengabaikan client-spoofed payload IDs.
   - **Zero Ride State Machine Mutation**: Status perjalanan tetap terkunci pada `COMPLETED`.

3. **Driver Rating Aggregation**:
   - Metode `DriverService.updateDriverRatingAggregation(driverId, score)` menghitung rata-rata bintang baru (`ratingAverage`) dan total ulasan (`ratingCount`) secara inkremental dan presisi saat penumpang menilai driver.
   - Snapshot rating pada objek order driver juga disinkronkan.

4. **Arsitektur API & Endpoints**:
   - `POST /rides/:id/rating` & `POST /ratings`: Submit ulasan perjalanan.
   - `GET /rides/:id/ratings`: Mengambil seluruh penilaian untuk perjalanan tertentu (terproteksi hak akses).
   - `GET /ratings/driver/:driverId/summary`: Ringkasan performa rating mitra driver (rata-rata bintang, jumlah ulasan, dan sebaran bintang 1–5).
   - `GET /ratings/driver/:driverId`: Daftar ulasan yang diterima mitra driver.
   - `GET /ratings/me`: Daftar ulasan yang pernah diberikan pengguna saat ini.

5. **Hasil Test Suite Otomatis**:
   - `backend/test/phase7-rating-system.spec.ts`: **10 / 10 Tests PASSED (100%)**
     - `TEST 1: Valid passenger rating` - PASSED
     - `TEST 2: Valid driver rating` - PASSED
     - `TEST 3: Invalid score rejection` - PASSED
     - `TEST 4: Rating sebelum COMPLETED rejection` - PASSED
     - `TEST 5: Rating oleh user tidak terkait rejection` - PASSED
     - `TEST 6: Duplicate rating rejection (409 Conflict)` - PASSED
     - `TEST 7: Self-rating rejection (400 Bad Request)` - PASSED
     - `TEST 8: Driver rating aggregation calculation` - PASSED
     - `TEST 9: Client-side spoofing prevention` - PASSED
     - `TEST 10: Ratings retrieval & permissions` - PASSED
   - `backend/test/phase7-database-foundation.spec.ts`: **10 / 10 Tests PASSED (100%)**
   - `backend/test/phase6c-settlement-earnings.spec.ts`: **10 / 10 Tests PASSED (100%)**
   - `backend/test/run-phase5-tests.ts`: **20 / 20 Tests PASSED (100%)**
   - Typecheck (`tsc --noEmit`): 0 errors.
   - Linter (`npm run lint`): 0 errors.
   - Compilation (`vite build`): Succeeded.

---

## 3. Boundary & Panduan Langkah Selanjutnya
- Scope Phase 7.2 selesai dan tervalidasi.
- **Jangan mengerjakan Earnings atau History pada tahap ini** sesuai instruksi.
- Siap melanjutkan ke Phase 7.3 (Historical Trips & Earnings Breakdown API) setelah konfirmasi.
