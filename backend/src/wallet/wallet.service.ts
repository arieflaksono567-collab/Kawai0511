import { Injectable, BadRequestException } from '@nestjs/common';
import { TopUpDto } from './dto/topup.dto';
import { PayRideDto } from './dto/pay-ride.dto';
import { WithdrawDto } from './dto/withdraw.dto';

export interface WalletTransaction {
  id: string;
  type: 'TOPUP' | 'PAYMENT' | 'EARNING' | 'COMMISSION' | 'WITHDRAW';
  amount: number;
  referenceId: string;
  description: string;
  balanceAfter: number;
  timestamp: string;
}

@Injectable()
export class WalletService {
  private passengerBalance = 100000;
  private driverBalance = 168000;
  private platformRevenue = 45000;

  private transactions: WalletTransaction[] = [
    {
      id: 'tx-001',
      type: 'TOPUP',
      amount: 100000,
      referenceId: 'TOP-0511-01',
      description: 'Top up saldo KawaiPay via Bank Kalsel VA',
      balanceAfter: 100000,
      timestamp: 'Hari ini, 09:30 WITA',
    },
    {
      id: 'tx-002',
      type: 'EARNING',
      amount: 15810,
      referenceId: 'RIDE-0511-12',
      description: 'Pendapatan trip Duta Mall -> ULM (85%)',
      balanceAfter: 168000,
      timestamp: 'Hari ini, 16:45 WITA',
    },
  ];

  async getWallets() {
    return {
      passenger: {
        userId: 'usr-pass-001',
        name: 'Arief Laksono',
        balance: this.passengerBalance,
        currency: 'IDR',
      },
      driver: {
        userId: 'usr-drv-001',
        name: 'Ahmad Gazali',
        balance: this.driverBalance,
        currency: 'IDR',
      },
      platform: {
        totalRevenue: this.platformRevenue,
        commissionRate: '15%',
      },
    };
  }

  async topUp(dto: TopUpDto) {
    if (dto.amount < 10000) {
      throw new BadRequestException('Nominal top up minimal Rp 10.000');
    }

    this.passengerBalance += dto.amount;
    const tx: WalletTransaction = {
      id: `tx-${Date.now().toString().slice(-4)}`,
      type: 'TOPUP',
      amount: dto.amount,
      referenceId: `TOP-${Date.now().toString().slice(-6)}`,
      description: `Top up saldo KawaiPay (${dto.method || 'QRIS'})`,
      balanceAfter: this.passengerBalance,
      timestamp: 'Baru saja',
    };
    this.transactions.unshift(tx);

    return {
      success: true,
      message: `Top up Rp ${dto.amount.toLocaleString('id-ID')} berhasil`,
      newBalance: this.passengerBalance,
    };
  }

  async payRide(dto: PayRideDto) {
    const totalFare = dto.amount;
    const driverShare = Math.round(totalFare * 0.85); // 85%
    const platformFee = totalFare - driverShare; // 15%

    if (dto.method === 'WALLET') {
      if (this.passengerBalance < totalFare) {
        throw new BadRequestException('Saldo KawaiPay tidak mencukupi untuk pembayaran');
      }

      this.passengerBalance -= totalFare;
      this.driverBalance += driverShare;
      this.platformRevenue += platformFee;

      this.transactions.unshift(
        {
          id: `tx-${Date.now().toString().slice(-4)}a`,
          type: 'PAYMENT',
          amount: -totalFare,
          referenceId: dto.rideId,
          description: `Pembayaran ojek perjalanan ${dto.rideId}`,
          balanceAfter: this.passengerBalance,
          timestamp: 'Baru saja',
        },
        {
          id: `tx-${Date.now().toString().slice(-4)}b`,
          type: 'EARNING',
          amount: driverShare,
          referenceId: dto.rideId,
          description: `Bagi hasil ojek 85% order ${dto.rideId}`,
          balanceAfter: this.driverBalance,
          timestamp: 'Baru saja',
        }
      );
    } else {
      // CASH payment: Penumpang bayar tunai ke driver, sistem memotong 15% komisi dari saldo driver
      this.driverBalance -= platformFee;
      this.platformRevenue += platformFee;

      this.transactions.unshift({
        id: `tx-${Date.now().toString().slice(-4)}c`,
        type: 'COMMISSION',
        amount: -platformFee,
        referenceId: dto.rideId,
        description: `Potongan komisi platform 15% order tunai ${dto.rideId}`,
        balanceAfter: this.driverBalance,
        timestamp: 'Baru saja',
      });
    }

    return {
      success: true,
      paymentMethod: dto.method,
      totalFare,
      driverShare,
      platformFee,
      passengerBalance: this.passengerBalance,
      driverBalance: this.driverBalance,
    };
  }

  async withdraw(dto: WithdrawDto) {
    if (dto.amount < 20000) {
      throw new BadRequestException('Minimal penarikan dana Rp 20.000');
    }
    if (this.driverBalance < dto.amount) {
      throw new BadRequestException('Saldo mitra driver tidak mencukupi');
    }

    this.driverBalance -= dto.amount;
    const tx: WalletTransaction = {
      id: `tx-${Date.now().toString().slice(-4)}w`,
      type: 'WITHDRAW',
      amount: -dto.amount,
      referenceId: `WD-${Date.now().toString().slice(-6)}`,
      description: `Penarikan saldo ke rekening ${dto.bankName} (${dto.accountNumber})`,
      balanceAfter: this.driverBalance,
      timestamp: 'Baru saja',
    };
    this.transactions.unshift(tx);

    return {
      success: true,
      message: `Permintaan pencairan Rp ${dto.amount.toLocaleString('id-ID')} ke ${dto.bankName} diproses`,
      newBalance: this.driverBalance,
    };
  }

  async getTransactions() {
    return this.transactions;
  }
}
