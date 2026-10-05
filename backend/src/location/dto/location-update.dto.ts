export class DriverLocationUpdateDto {
  driverId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  battery: number;
  ping: number;
  timestamp?: string;
}
