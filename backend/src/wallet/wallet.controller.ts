import { Controller, Get, Post, Body } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TopUpDto } from './dto/topup.dto';
import { PayRideDto } from './dto/pay-ride.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Controller('wallet')
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
