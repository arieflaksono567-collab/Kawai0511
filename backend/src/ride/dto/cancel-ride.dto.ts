export class CancelRideDto {
  reason?: string;
  cancelledBy?: 'PASSENGER' | 'DRIVER' | 'SYSTEM';
}
