export class SendMessageDto {
  orderId: string;
  orderType: 'RIDE' | 'FOOD' | 'DELIVERY';
  senderRole: 'CUSTOMER' | 'DRIVER';
  message: string;
}
