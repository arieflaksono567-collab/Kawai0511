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
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { LedgerService } from './ledger.service';
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
    private readonly ledgerService: LedgerService
  ) {}

  /**
   * POST /payments
   * Create payment for completed ride (CASH or DIGITAL)
   */
  @Post()
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
  async getPaymentStatus(@Req() req: any, @Param('id') id: string) {
    const status = this.paymentService.getPaymentStatus(id, req.user);
    return { statusCode: HttpStatus.OK, data: status };
  }

  /**
   * POST /payments/:id/cancel
   * Cancel pending payment
   */
  @Post(':id/cancel')
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
   * Explicit Settlement trigger for PAID payments (Phase 6C)
   */
  @Post(':id/settle')
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
   * Get settlement details for a payment
   */
  @Get(':id/settlement')
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
   * GET /payments/config/split
   */
  @Get('config/split')
  async getSplitConfig() {
    const config = this.paymentService.getSplitConfig();
    return { statusCode: HttpStatus.OK, data: config };
  }

  /**
   * PUT /payments/config/split
   */
  @Put('config/split')
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
}

@Controller('ledger')
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
