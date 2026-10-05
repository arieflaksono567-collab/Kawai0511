# KAWAI 0511 — System Architecture

## Architecture Diagram (Phase 2 Auth System)

```
[ Passenger App (Flutter) ]   [ Driver App (Flutter) ]   [ Admin Dashboard (React/Flutter) ]
            │                             │                               │
            └─────────────────────────────┼───────────────────────────────┘
                                          │  HTTPS / REST / JSON
                                          ▼
                         [ API Gateway / NestJS Core ]
                         ├── JwtAuthGuard & RolesGuard
                         ├── AuthService
                         │   ├── normalizePhoneNumber()
                         │   ├── OtpProvider Abstraction (MockOtpProvider)
                         │   └── Token Generation (Access 15m, Refresh 30d)
                         └── UsersService (Profile Management)
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
       [ PostgreSQL 16 + PostGIS ]                         [ Redis Cache ]
       ├── users (id, phone, role)                         ├── OTP rate limiting
       ├── otp_codes (hash, expiry)                        └── Session blacklist
       └── refresh_tokens (rotation)
```
