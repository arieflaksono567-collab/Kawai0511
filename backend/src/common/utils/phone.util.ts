/**
 * Utility normalisasi nomor telepon KAWAI 0511 (Indonesia standard)
 * Mengonversi variasi penulisan nomor handphone ke format E.164 (+62xxxxxxxxxxx)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Nomor telepon harus berupa string yang valid');
  }

  // Hapus semua karakter non-digit kecuali tanda plus (+) di awal
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Jika diawali '08', ganti '0' dengan '62'
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    // Jika diawali langsung '8', tambahkan '62'
    cleaned = '62' + cleaned;
  }

  // Validasi nomor handphone Indonesia: harus berawalan 628 dan panjang antara 10 hingga 15 digit
  if (!cleaned.startsWith('628') || cleaned.length < 11 || cleaned.length > 15) {
    throw new Error('Format nomor telepon tidak valid. Gunakan format nomor handphone Indonesia yang benar.');
  }

  return '+' + cleaned;
}
