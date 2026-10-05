export class PayRideDto {
  rideId: string;
  amount: number;
  method: 'CASH' | 'WALLET';
  passengerId?: string;
  driverId?: string;
}
