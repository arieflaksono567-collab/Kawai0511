export class CreateDeliveryDto {
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  itemType: string; // 'DOKUMEN', 'PAKET', 'MAKANAN', 'ELEKTRONIK'
  weightKg: number;
  distanceKm: number;
}
