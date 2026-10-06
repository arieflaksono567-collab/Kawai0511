export class UpdateLocationDto {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  altitudeMeters?: number;
  speedMps?: number;
  headingDegrees?: number;
  batteryLevel?: number;
  networkType?: string;
  recordedAt: string;
}
