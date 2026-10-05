# PHASE 2 — AUTHENTICATION & USER SYSTEM

## Deskripsi
Implementasi sistem autentikasi dan manajemen akun terpusat:
- Login berbasis nomor telepon dengan normalisasi format internasional (+62)
- Sistem OTP 6 digit aman (kedaluwarsa 5 menit, batasan 5 percobaan, cooldown 60 detik)
- Abstraksi `OtpProvider` dengan implementasi `MockOtpProvider`
- Penerbitan JWT Access Token (15 menit) dan Refresh Token Rotation (30 hari)
- Centralized Role-Based Access Control (RBAC): `CUSTOMER`, `DRIVER`, `ADMIN`
- Manajemen profil pengguna: `GET /users/me`, `PATCH /users/me`
- Proteksi route: `JwtAuthGuard` & `RolesGuard`
- Layar autentikasi lengkap pada Flutter Passenger dan Driver Apps
- 12 Acceptance Tests berhasil 100%

## Status
**STATUS**: COMPLETE ✓
