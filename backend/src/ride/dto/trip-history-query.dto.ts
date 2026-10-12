export class TripHistoryQueryDto {
  page?: number;
  limit?: number;
  offset?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'completedAt' | 'totalFare' | 'distanceKm';
  sortOrder?: 'asc' | 'desc';
}
