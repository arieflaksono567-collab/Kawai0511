# KAWAI 0511 — AI Handoff Document

## 1. Project Identity
- **Nama Platform**: KAWAI 0511 (Ojek Online & Super-App Kota Banjarmasin, Kalimantan Selatan)
- **Kode Area**: 0511
- **Arsitektur**: Monorepo terstruktur (Backend NestJS + Frontend Mobile Apps Flutter + Console Tailwind React)
- **Basis Data**: PostgreSQL 16 + PostGIS (Spasial) + Redis (Cache/Session/PubSub)

## 2. Status Saat Ini
- **Fase Sedang Berjalan**: **PHASE 2 — AUTHENTICATION & USER SYSTEM**
- **Cakupan Phase 2**:
  - Registrasi & Login OTP berbasis nomor telepon internasional (+62 normalisasi)
  - JWT Access Token (15 menit) + Refresh Token Rotation (30 hari)
  - Penyimpanan hash OTP dan token revocations terpisah
  - Centralized RBAC: `CUSTOMER`, `DRIVER`, `ADMIN`
  - Endpoint `GET /auth/me`, `GET /users/me`, `PATCH /users/me`
  - Seluruh 12 acceptance test scenarios lulus 100%

## 3. Aturan Scope
- Dilarang mengimplementasikan fitur Phase 3+ (KYC, SIM/KTP/SKCK, GPS tracking, matching, fare calculation, wallet, food, chat) sebelum Phase 2 tuntas dan dilaporkan.
