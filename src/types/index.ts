export type ServiceType = 'ride' | 'delivery' | 'food' | 'mart';

export interface LocationPoint {
  id: string;
  name: string;
  address: string;
  x: number; // percentage on map (0-100)
  y: number; // percentage on map (0-100)
  landmark?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalTrips: number;
  vehicle: string;
  plateNumber: string;
  photoUrl: string;
  x: number;
  y: number;
  isOnline: boolean;
}

export type OrderStatus =
  | 'idle'
  | 'searching'
  | 'accepted'
  | 'heading_to_pickup'
  | 'arrived_pickup'
  | 'on_the_way'
  | 'completed'
  | 'cancelled';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  popular?: boolean;
}

export interface Merchant {
  id: string;
  name: string;
  category: string;
  rating: number;
  distanceKm: number;
  estimatedMinutes: number;
  address: string;
  image: string;
  badge?: string;
  menu: MenuItem[];
}

export interface CartItem {
  menuItem: MenuItem;
  merchantId: string;
  quantity: number;
  notes?: string;
}

export interface OrderDetails {
  id: string;
  service: ServiceType;
  status: OrderStatus;
  pickup: LocationPoint;
  destination: LocationPoint;
  distanceKm: number;
  fare: number;
  discount: number;
  totalPay: number;
  paymentMethod: 'kawaipay' | 'cash';
  driver?: Driver;
  createdAt: string;
  packageDetails?: {
    type: string;
    weight: string;
    recipientName: string;
    recipientPhone: string;
    notes: string;
  };
  foodItems?: CartItem[];
  shoppingItems?: string[];
  vehicleType?: 'motor' | 'car';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'driver';
  text: string;
  time: string;
}
