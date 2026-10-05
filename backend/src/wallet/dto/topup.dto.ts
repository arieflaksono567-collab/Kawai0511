export class TopUpDto {
  userId?: string;
  amount: number;
  method?: string; // 'QRIS', 'VIRTUAL_ACCOUNT', 'TRANSFER'
}
