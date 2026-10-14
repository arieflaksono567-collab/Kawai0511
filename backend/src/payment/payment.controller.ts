import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { LedgerService } from './ledger.service';
import { DriverEarningsService } from './driver-earnings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import {
  CreatePaymentDto,
  CancelPaymentDto,
  RefundPaymentDto,
  UpdateSplitConfigDto,
} from './dto/create-payment.dto';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly ledgerService: LedgerService,
    private readonly driverEarningsService?: DriverEarningsService
  ) {}

  /**
   * POST /payments
   * Create payment for completed ride (CASH or DIGITAL)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPayment(@Req() req: any, @Body() dto: CreatePaymentDto) {
    if (req.user && !dto.payerId) {
      dto.payerId = req.user.id;
    }

    const result = await this.paymentService.createPayment(dto);
    return {
      statusCode: HttpStatus.CREATED,
      message:
        dto.method === 'CASH'
          ? 'Pembayaran tunai berhasil dicatat dan diselesaikan'
          : 'Pembayaran digital berhasil diinisiasi, menunggu konfirmasi gateway',
      data: result,
    };
  }

  /**
   * GET /payments/:id
   * Get payment details (authorized for passenger owner, driver payee, or admin)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPayment(@Req() req: any, @Param('id') id: string) {
    const payment = this.paymentService.getPaymentById(id, req.user);
    if (!payment) {
      throw new NotFoundException(`Pembayaran dengan ID ${id} tidak ditemukan`);
    }
    return { statusCode: HttpStatus.OK, data: payment };
  }

  /**
   * GET /payments/:id/status
   * Normalized payment status view
   */
  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(@Req() req: any, @Param('id') id: string) {
    const status = this.paymentService.getPaymentStatus(id, req.user);
    return { statusCode: HttpStatus.OK, data: status };
  }

  /**
   * POST /payments/:id/cancel
   * Cancel pending payment
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelPayment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto?: CancelPaymentDto
  ) {
    const payment = await this.paymentService.cancelPayment(
      id,
      dto?.reason,
      req.user
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Pembayaran berhasil dibatalkan',
      data: payment,
    };
  }

  /**
   * POST /payments/:id/refund
   * Refund a paid payment (Admin only)
   */
  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async refundPayment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto?: RefundPaymentDto
  ) {
    const result = await this.paymentService.refundPayment(
      id,
      dto?.amount,
      dto?.reason,
      req.user
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Pengembalian dana (refund) berhasil diproses',
      data: result,
    };
  }

  /**
   * POST /payments/:id/settle
   * Explicit Settlement trigger for PAID payments (Phase 6C, Admin only)
   */
  @Post(':id/settle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async settlePayment(@Param('id') id: string) {
    const settlement = await this.paymentService.settlePayment(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Settlement bagi hasil transaksi berhasil diproses dan dicatat di buku besar',
      data: settlement,
    };
  }

  /**
   * GET /payments/:id/settlement
   * Get settlement details for a payment (Admin only)
   */
  @Get(':id/settlement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getPaymentSettlement(@Param('id') id: string) {
    const settlement = this.paymentService.getSettlementByPaymentId(id);
    if (!settlement) {
      throw new NotFoundException(`Data settlement untuk payment ${id} tidak ditemukan`);
    }
    return {
      statusCode: HttpStatus.OK,
      data: settlement,
    };
  }

  /**
   * POST /payments/webhook/:provider
   * Inbound Webhook Endpoint for Payment Providers
   * Verifies signature, replay protection, timestamp, idempotency, duplicate events
   */
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, any>,
    @Body() payload: any
  ) {
    const result = await this.paymentService.handleWebhook(
      provider,
      headers,
      payload
    );
    return {
      statusCode: HttpStatus.OK,
      message: result.message || 'Webhook processed successfully',
      data: result,
    };
  }

  /**
   * GET /payments/ride/:rideId
   */
  @Get('ride/:rideId')
  @UseGuards(JwtAuthGuard)
  async getPaymentByRide(@Req() req: any, @Param('rideId') rideId: string) {
    const payment = this.paymentService.getPaymentByRideId(rideId, req.user);
    if (!payment) {
      throw new NotFoundException(
        `Pembayaran untuk order ${rideId} tidak ditemukan`
      );
    }
    return { statusCode: HttpStatus.OK, data: payment };
  }

  /**
   * GET /payments/config/split (Admin only)
   */
  @Get('config/split')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getSplitConfig() {
    const config = this.paymentService.getSplitConfig();
    return { statusCode: HttpStatus.OK, data: config };
  }

  /**
   * PUT /payments/config/split (Admin only)
   */
  @Put('config/split')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateSplitConfig(@Body() dto: UpdateSplitConfigDto) {
    const updated = this.paymentService.setSplitConfig(
      dto.driverSharePercent,
      dto.platformSharePercent
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Konfigurasi bagi hasil berhasil diperbarui',
      data: updated,
    };
  }

  /**
   * GET /payments/driver-earnings/:driverId
   * Dashboard pendapatan driver dari Database Ledger (Phase 7.3)
   */
  @Get('driver-earnings/:driverId')
  @UseGuards(JwtAuthGuard)
  async getDriverEarningsDashboard(
    @Param('driverId') driverId: string,
    @Req() req: any
  ) {
    if (this.driverEarningsService) {
      const data = await this.driverEarningsService.getDriverEarningsDashboard(
        driverId,
        { period: req?.query?.period },
        req?.user
      );
      return { statusCode: HttpStatus.OK, data };
    }
    const data = this.paymentService.getDriverEarnings(driverId, req?.query?.period);
    return { statusCode: HttpStatus.OK, data };
  }

  /**
   * GET /payments/driver-earnings/:driverId/summary
   * Ringkasan multi-periode pendapatan driver
   */
  @Get('driver-earnings/:driverId/summary')
  @UseGuards(JwtAuthGuard)
  async getDriverEarningsSummary(
    @Param('driverId') driverId: string,
    @Req() req: any
  ) {
    if (this.driverEarningsService) {
      const data = await this.driverEarningsService.getDriverEarningsMultiPeriodSummary(
        driverId,
        req?.user
      );
      return { statusCode: HttpStatus.OK, data };
    }
    const data = this.paymentService.getDriverEarnings(driverId, 'all-time');
    return { statusCode: HttpStatus.OK, data };
  }
}

@Controller('ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('accounts')
  async getAccounts() {
    const accounts = this.ledgerService.getAllAccounts();
    return { statusCode: HttpStatus.OK, data: accounts };
  }

  @Get('balance/:accountId')
  async getAccountBalance(@Param('accountId') accountId: string) {
    const balance = this.ledgerService.getAccountBalance(accountId);
    return { statusCode: HttpStatus.OK, data: balance };
  }

  @Get('transactions/:id')
  async getTransaction(@Param('id') id: string) {
    const tx = this.ledgerService.getTransaction(id);
    if (!tx) {
      throw new NotFoundException(`Transaksi ledger ${id} tidak ditemukan`);
    }
    const entries = this.ledgerService.getEntriesForTransaction(id);
    return {
      statusCode: HttpStatus.OK,
      data: {
        transaction: tx,
        entries,
      },
    };
  }

  @Get('audit')
  async auditLedger() {
    const audit = this.ledgerService.auditAllTransactions();
    return {
      statusCode: HttpStatus.OK,
      data: audit,
    };
  }
}
