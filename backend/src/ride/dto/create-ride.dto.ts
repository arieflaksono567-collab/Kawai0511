export class CreateRideDto {
  passengerId?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm?: number;
  durationMinutes?: number;
}
