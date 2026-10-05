export interface OrderItemDto {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

export class CreateFoodOrderDto {
  merchantId: string;
  items: OrderItemDto[];
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  distanceKm?: number;
}
