# KAWAI 0511 — Architectural Decision Log (ADR)

## ADR-001: Centralized Role Names
- **Date**: 2026-10-04
- **Decision**: Menetapkan tiga role resmi: `CUSTOMER`, `DRIVER`, `ADMIN`.
- **Reason**: Menjamin konsistensi izin akses pada token JWT dan guard RBAC lintas platform (Passenger, Driver, Admin).

## ADR-002: Phone Normalization Standard (+62)
- **Date**: 2026-10-04
- **Decision**: Seluruh nomor handphone dinormalisasi ke format E.164 (`+628xxxxxxxxxx`) sebelum disimpan ke basis data atau diperiksa.
- **Reason**: Mencegah duplikasi akun dari input lokal seperti `0812...`, `812...`, atau `+628...`.

## ADR-003: Refresh Token Rotation
- **Date**: 2026-10-04
- **Decision**: Setiap pemanggilan endpoint `POST /auth/refresh` akan mencabut (*revoke*) refresh token lama dan menerbitkan token baru.
- **Reason**: Mencegah serangan *token replay/theft*. Penggunaan kembali token yang sudah dicabut langsung ditolak (401).
