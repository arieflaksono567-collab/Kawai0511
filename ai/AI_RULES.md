# KAWAI 0511 — AI Development Rules

1. **Phase Execution Discipline**:
   - Selalu selesaikan fase yang sedang ditugaskan sebelum melangkah ke fase berikutnya.
   - Jangan menambahkan fitur di luar scope fase yang sedang aktif.
   - Ikuti alur: BUILD → TEST → VALIDATE → DOCUMENT → STOP.

2. **Security & Data Confidentiality**:
   - OTP tidak boleh dikirimkan dalam payload respons API (`{"success": true, "message": "OTP sent"}`).
   - OTP, JWT secret, dan refresh token tidak boleh dicatat dalam plaintext logs.
   - Kata sandi (jika digunakan) wajib di-hash menggunakan Argon2id.

3. **Separation of Concerns**:
   - Controller → Service → Provider / ORM Repository → Database.
   - OtpProvider harus diabstraksikan melalui interface (misal `MockOtpProvider` untuk development/testing).

4. **Nomor Telepon Standar**:
   - Semua nomor telepon wajib dinormalisasi ke format internasional E.164 (+62xxxxxxxxxxx).
