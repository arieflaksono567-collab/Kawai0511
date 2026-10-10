import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  /**
   * POST /ratings
   * Submit rating untuk order perjalanan (Customer -> Driver atau Driver -> Customer)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitRating(@Req() req: any, @Body() dto: CreateRatingDto) {
    if (!dto.rideId) {
      throw new BadRequestException('ID perjalanan (rideId) wajib diisi');
    }

    const authenticatedUser = req.user || {
      id: 'b0000000-0000-0000-0000-000000000002',
      role: 'CUSTOMER',
    };

    const result = await this.ratingService.submitRating(
      dto.rideId,
      authenticatedUser,
      dto
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: result.message,
      data: result,
    };
  }

  /**
   * GET /ratings/ride/:rideId
   * Ambil daftar penilaian untuk perjalanan tertentu
   */
  @Get('ride/:rideId')
  @UseGuards(JwtAuthGuard)
  async getRatingsForRide(@Req() req: any, @Param('rideId') rideId: string) {
    const authenticatedUser = req.user || {
      id: 'b0000000-0000-0000-0000-000000000002',
      role: 'CUSTOMER',
    };

    const ratings = await this.ratingService.getRatingsForRide(
      rideId,
      authenticatedUser
    );

    return {
      statusCode: HttpStatus.OK,
      data: ratings,
    };
  }

  /**
   * GET /ratings/driver/:driverId/summary
   * Ambil ringkasan performa rating mitra driver (rata-rata bintang, jumlah, breakdown)
   */
  @Get('driver/:driverId/summary')
  async getDriverSummary(@Param('driverId') driverId: string) {
    const summary = await this.ratingService.getDriverRatingSummary(driverId);
    return {
      statusCode: HttpStatus.OK,
      data: summary,
    };
  }

  /**
   * GET /ratings/driver/:driverId
   * Ambil daftar ulasan yang diterima mitra driver
   */
  @Get('driver/:driverId')
  @UseGuards(JwtAuthGuard)
  async getDriverRatings(@Req() req: any, @Param('driverId') driverId: string) {
    const authenticatedUser = req.user || {
      id: 'd0000000-0000-0000-0000-000000000001',
      role: 'DRIVER',
      driverId: 'd0000000-0000-0000-0000-000000000001',
    };

    const ratings = await this.ratingService.getDriverRatings(
      driverId,
      authenticatedUser
    );

    return {
      statusCode: HttpStatus.OK,
      data: ratings,
    };
  }

  /**
   * GET /ratings/me
   * Ambil daftar penilaian yang pernah diberikan oleh user terautentikasi
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyGivenRatings(@Req() req: any) {
    const authenticatedUser = req.user || {
      id: 'b0000000-0000-0000-0000-000000000002',
      role: 'CUSTOMER',
    };

    const ratings = await this.ratingService.getMyGivenRatings(authenticatedUser);

    return {
      statusCode: HttpStatus.OK,
      data: ratings,
    };
  }
}
