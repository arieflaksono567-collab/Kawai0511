/**
 * KAWAI 0511 - Phase 7.2 Rating DTO
 */

export class CreateRatingDto {
  /**
   * ID order perjalanan (opsional jika disediakan melalui URL parameter /rides/:id/rating)
   */
  rideId?: string;

  /**
   * Skor penilaian (1 - 5)
   */
  score!: number;

  /**
   * Ulasan/komentar opsional dari reviewer
   */
  comment?: string;

  /**
   * Tag kategori umpan balik opsional (e.g. ['RAMAH', 'HELM_BERSIH', 'TEPAT_WAKTU'])
   */
  tags?: string[];

  /**
   * Nominal tip opsional untuk mitra driver (Rupiah integer IDR)
   */
  tipAmount?: number;
}
