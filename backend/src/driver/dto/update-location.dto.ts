export class UpdateLocationDto {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  battery?: number;
  ping?: number;
  network?: string;
}
