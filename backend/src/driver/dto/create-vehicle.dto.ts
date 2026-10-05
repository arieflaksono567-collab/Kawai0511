export class CreateVehicleDto {
  vehicleType?: string; // default MOTORCYCLE
  brand: string;
  model: string;
  productionYear: number;
  color: string;
  licensePlate: string;
  registrationNumber?: string;
}
