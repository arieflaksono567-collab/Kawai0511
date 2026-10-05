# PHASE 3 — DRIVER SYSTEM

## Deskripsi
Manajemen identitas mitra pengemudi, verifikasi KYC, pendaftaran kendaraan, dan kelayakan online:
- Pemisahan profil driver dari user identity (`drivers.user_id → users.id`).
- Siklus verifikasi pengemudi: `PENDING` → `UNDER_REVIEW` → `APPROVED` / `REJECTED` / `SUSPENDED`.
- Status operasional pengemudi: `OFFLINE` / `ONLINE` / `SUSPENDED`.
- Unggah dan verifikasi 4 berkas KYC wajib: `KTP`, `SIM_C`, `STNK`, `SKCK` dengan nomor dokumen bermasker.
- Pendaftaran sepeda motor aktif dengan normalisasi plat nomor (contoh: `DA 5110 KAW`).
- Centralized `DriverEligibilityService`: Memastikan HANYA driver yang telah `APPROVED` dengan 4 berkas valid + kendaraan disetujui yang dapat beralih ke status `ONLINE`.
- Antrean verifikasi admin lengkap dengan Audit Log pada setiap keputusan persetujuan, penolakan, maupun suspensi.
- Implementasi antarmuka pada Flutter Driver App dan Flutter Admin App.
- Seluruh 20 skenario Acceptance Tests berhasil 100%.

## Status
**STATUS**: COMPLETE ✓
