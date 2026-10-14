import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TopUpDto } from './dto/topup.dto';
import { PayRideDto } from './dto/pay-ride.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  async getWallets() {
    return this.walletService.getWallets();
  }

  @Post('topup')
  async topUp(@Body() dto: TopUpDto) {
    return this.walletService.topUp(dto);
  }

  @Post('pay-ride')
  async payRide(@Body() dto: PayRideDto) {
    return this.walletService.payRide(dto);
  }

  @Post('withdraw')
  async withdraw(@Body() dto: WithdrawDto) {
    return this.walletService.withdraw(dto);
  }

  @Get('transactions')
  async getTransactions() {
    return this.walletService.getTransactions();
  }
}
