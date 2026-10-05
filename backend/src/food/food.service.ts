import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateFoodOrderDto } from './dto/create-food-order.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';

export type FoodOrderStatus =
  | 'ORDER_PLACED'
  | 'MERCHANT_ACCEPTED'
  | 'COOKING'
  | 'READY_FOR_PICKUP'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_PICKED_UP'
  | 'ON_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

@Injectable()
export class FoodService {
  private merchants = [
    {
      id: 'm0000000-0000-0000-0000-000000000001',
      name: 'Soto Banjar Bang Amat',
      address: 'Jl. Banua Anyar No.56, Banjarmasin Timur',
      rating: 4.95,
      category: 'KULINER BANJAR',
      isOpen: true,
      menu: [
        {
          id: 'item-1',
          name: 'Soto Banjar Spesial Telur Bebek',
          description: 'Soto ayam kampung khas Banjar kuah rempah susu dengan perkedel singkong & telur bebek',
          price: 28000,
          category: 'MAKANAN',
          isAvailable: true,
        },
        {
          id: 'item-2',
          name: 'Sate Ayam Bumbu Banjar (10 Tusuk)',
          description: 'Sate ayam empuk dengan olesan saus manis pedas khas sungai Martapura',
          price: 25000,
          category: 'MAKANAN',
          isAvailable: true,
        },
        {
          id: 'item-3',
          name: 'Es Kelapa Muda Jeruk Purut',
          description: 'Kelapa muda segar alami disajikan dengan perasan jeruk khas Banjar',
          price: 12000,
          category: 'MINUMAN',
          isAvailable: true,
        },
      ],
    },
    {
      id: 'm0000000-0000-0000-0000-000000000002',
      name: 'Ketupat Kandangan H. Muis',
      address: 'Jl. Bumi Mas Raya No.12, Pemurus Baru',
      rating: 4.88,
      category: 'KULINER BANJAR',
      isOpen: true,
      menu: [
        {
          id: 'item-4',
          name: 'Ketupat Kandangan Ikan Haruan Asap',
          description: 'Ketupat beras lokal dengan kuah santan santap dan ikan gabus asap bakar',
          price: 26000,
          category: 'MAKANAN',
          isAvailable: true,
        },
      ],
    },
  ];

  private activeFoodOrders = new Map<string, any>();
  private activeDeliveries = new Map<string, any>();

  async getMerchants() {
    return this.merchants;
  }

  async getMerchantMenu(merchantId: string) {
    const m = this.merchants.find((x) => x.id === merchantId);
    if (!m) throw new NotFoundException('Merchant tidak ditemukan');
    return m;
  }

  // Create Food Order
  async createFoodOrder(dto: CreateFoodOrderDto) {
    const subtotal = dto.items.reduce((acc, it) => acc + it.price * it.quantity, 0);
    const distance = dto.distanceKm || 3.5;
    // Delivery fee = base 8000 + 2000 per km
    const deliveryFee = Math.round(8000 + distance * 2000);
    const platformFee = 2000;
    const totalPrice = subtotal + deliveryFee + platformFee;

    const orderId = `kfd-${Date.now().toString().slice(-6)}`;
    const order = {
      id: orderId,
      merchantId: dto.merchantId,
      merchantName: 'Soto Banjar Bang Amat',
      items: dto.items,
      subtotal,
      deliveryFee,
      platformFee,
      totalPrice,
      status: 'ORDER_PLACED' as FoodOrderStatus,
      deliveryAddress: dto.deliveryAddress,
      driver: {
        name: 'Ahmad Gazali',
        plateNumber: 'DA 4511 KW',
        phone: '081390511200',
      },
      createdAt: new Date().toISOString(),
    };

    this.activeFoodOrders.set(orderId, order);
    return order;
  }

  // Advance Food Order State
  async updateFoodOrderStatus(orderId: string, status: FoodOrderStatus) {
    const order = this.activeFoodOrders.get(orderId);
    if (!order) {
      return {
        id: orderId,
        status,
        message: `Order ${orderId} bertransisi ke ${status}`,
      };
    }
    order.status = status;
    return order;
  }

  // Create Package Delivery (Kawai Send)
  async createDelivery(dto: CreateDeliveryDto) {
    const baseFare = 9000;
    const perKm = 2500;
    // Berat di atas 2 kg terkena tambahan Rp 1.500 per kg
    const weightSurcharge = dto.weightKg > 2 ? Math.round((dto.weightKg - 2) * 1500) : 0;
    const totalFare = Math.round(baseFare + dto.distanceKm * perKm + weightSurcharge);

    const deliveryId = `ksnd-${Date.now().toString().slice(-6)}`;
    const delivery = {
      id: deliveryId,
      senderName: dto.senderName,
      senderAddress: dto.senderAddress,
      receiverName: dto.receiverName,
      receiverAddress: dto.receiverAddress,
      itemType: dto.itemType,
      weightKg: dto.weightKg,
      distanceKm: dto.distanceKm,
      totalFare,
      status: 'SEARCHING',
      driver: {
        name: 'Ahmad Gazali',
        plateNumber: 'DA 4511 KW',
      },
      createdAt: new Date().toISOString(),
    };

    this.activeDeliveries.set(deliveryId, delivery);
    return delivery;
  }
}
