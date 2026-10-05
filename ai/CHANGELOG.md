# KAWAI 0511 — Changelog

## [Phase 3] - 2026-10-05
### Added
- Tabel basis data `drivers`, `driver_documents`, `vehicles`, dan `audit_logs` pada `003_driver_system.sql`.
- Abstraksi penyimpanan dokumen `DocumentStorageProvider` dan implementasi `LocalDocumentStorageProvider`.
- Centralized `DriverEligibilityService` sebagai sumber kebenaran status kelayakan online driver.
- Endpoint driver: `GET /drivers/me`, `PATCH /drivers/me`, `GET /drivers/me/documents`, `POST /drivers/me/documents`, `GET /drivers/me/vehicles`, `POST /drivers/me/vehicles`, `GET /drivers/me/eligibility`, `GET /drivers/me/status`, `POST /drivers/me/status/online`, `POST /drivers/me/status/offline`.
- Endpoint admin: `GET /admin/drivers`, `GET /admin/drivers/:id`, `POST /admin/drivers/:id/documents/:docId/approve`, `POST /admin/drivers/:id/documents/:docId/reject`, `POST /admin/drivers/:id/vehicles/:vehId/approve`, `POST /admin/drivers/:id/vehicles/:vehId/reject`, `POST /admin/drivers/:id/approve`, `POST /admin/drivers/:id/reject`, `POST /admin/drivers/:id/suspend`, `POST /admin/drivers/:id/unsuspend`.
- UI Flutter Driver App: checklist syarat kelayakan operasional, kartu KYC dokumen bermasker, pendaftaran kendaraan, dan tombol Online/Offline dinamis.
- UI Flutter Admin App: antrean verifikasi KYC mitra pengemudi dengan aksi persetujuan, penolakan, dan suspensi.
- Test suites: unit test kelayakan `driver-eligibility.spec.ts` dan 20 skenario acceptance tests `phase3-acceptance.spec.ts`.

## [Phase 2] - 2026-10-04
### Added
- Utility normalisasi nomor telepon `normalizePhoneNumber()` (+62 Indonesia format).
- Abstraksi `OtpProvider` dan implementasi `MockOtpProvider`.
- Tabel basis data `otp_codes` dan `refresh_tokens`.
- JWT Access Token (15 menit) dan Refresh Token Rotation (30 hari).
- Centralized RBAC: `RolesGuard`, `JwtAuthGuard`, `@Roles()`.
- Endpoint `POST /auth/request-otp`, `POST /auth/verify-otp`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Endpoint `GET /users/me`, `PATCH /users/me`.
- Flutter Passenger & Driver authentication screens.
- Test suite: unit tests dan 12 acceptance tests.
