import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  LedgerAccount,
  LedgerAccountType,
  LedgerEntry,
  LedgerEntryInput,
  LedgerTransaction,
} from './payment.types';

export class UnbalancedLedgerException extends BadRequestException {
  constructor(totalDebit: number, totalCredit: number) {
    super(
      `Ledger transaction unbalanced: SUM(debit)=${totalDebit} does not equal SUM(credit)=${totalCredit}`
    );
  }
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  // In-Memory Persistent Store (PostgreSQL 16 representation)
  private accounts = new Map<string, LedgerAccount>();
  private accountByCode = new Map<string, string>(); // code -> id
  private transactions = new Map<string, LedgerTransaction>();
  private transactionByRef = new Map<string, string>(); // `${refType}:${refId}` -> id
  private entries: LedgerEntry[] = [];

  constructor() {
    this.seedSystemAccounts();
  }

  private seedSystemAccounts() {
    this.createAccountDirect({
      id: 'a0000000-0000-0000-0000-000000000001',
      code: 'PLATFORM_REVENUE_IDR',
      name: 'Platform Revenue (Pendapatan Komisi 15%)',
      type: 'PLATFORM_REVENUE',
      currency: 'IDR',
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    this.createAccountDirect({
      id: 'a0000000-0000-0000-0000-000000000002',
      code: 'PAYMENT_CLEARING_IDR',
      name: 'Payment Clearing (Kliring Provider Digital)',
      type: 'PAYMENT_CLEARING',
      currency: 'IDR',
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    this.createAccountDirect({
      id: 'a0000000-0000-0000-0000-000000000003',
      code: 'CASH_RECEIVABLE_IDR',
      name: 'Cash Receivable (Penerimaan Tunai Driver)',
      type: 'CASH_RECEIVABLE',
      currency: 'IDR',
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    this.createAccountDirect({
      id: 'a0000000-0000-0000-0000-000000000004',
      code: 'REFUND_PAYABLE_IDR',
      name: 'Refund Payable (Kewajiban Pengembalian Dana)',
      type: 'REFUND_PAYABLE',
      currency: 'IDR',
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  }

  private createAccountDirect(acc: LedgerAccount) {
    this.accounts.set(acc.id, acc);
    this.accountByCode.set(acc.code, acc.id);
  }

  /**
   * Get or create account for a driver or user
   */
  getOrCreateDriverAccount(driverId: string): LedgerAccount {
    const code = `DRIVER_PAYABLE_${driverId}`;
    const existingId = this.accountByCode.get(code);
    if (existingId) {
      return this.accounts.get(existingId)!;
    }

    const id = crypto.randomUUID();
    const account: LedgerAccount = {
      id,
      code,
      name: `Driver Payable (Mitra ${driverId})`,
      type: 'DRIVER_PAYABLE',
      ownerId: driverId,
      currency: 'IDR',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    this.createAccountDirect(account);
    return account;
  }

  getAccountByCode(code: string): LedgerAccount {
    const id = this.accountByCode.get(code);
    if (!id) {
      throw new NotFoundException(`Ledger account with code ${code} not found`);
    }
    const acc = this.accounts.get(id);
    if (!acc) {
      throw new NotFoundException(`Ledger account with id ${id} not found`);
    }
    return acc;
  }

  getAccountById(id: string): LedgerAccount {
    const acc = this.accounts.get(id);
    if (!acc) {
      throw new NotFoundException(`Ledger account with id ${id} not found`);
    }
    return acc;
  }

  getAllAccounts(): LedgerAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Atomic Double-Entry Ledger Transaction Record
   * Strictly enforces SUM(debit) === SUM(credit)
   * Prevents negative entries, requires valid accounts
   * Prevents duplicate reference transactions
   */
  recordTransaction(params: {
    referenceType: string;
    referenceId: string;
    description: string;
    entries: LedgerEntryInput[];
  }): { transaction: LedgerTransaction; entries: LedgerEntry[] } {
    const { referenceType, referenceId, description, entries } = params;

    // 1. Check duplicate reference
    const refKey = `${referenceType}:${referenceId}`;
    if (this.transactionByRef.has(refKey)) {
      throw new ConflictException(
        `Duplicate ledger transaction for reference ${referenceType} ${referenceId}`
      );
    }

    // 2. Minimum 2 entries check
    if (!entries || entries.length < 2) {
      throw new BadRequestException(
        'Ledger transaction must contain at least 2 entries for double-entry bookkeeping'
      );
    }

    // 3. Validate entries and check for negatives / non-integers
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      if (!this.accounts.has(entry.accountId)) {
        throw new NotFoundException(`Ledger account ${entry.accountId} does not exist`);
      }

      if (typeof entry.debit !== 'number' || typeof entry.credit !== 'number') {
        throw new BadRequestException('Debit and credit amounts must be numeric');
      }

      if (!Number.isInteger(entry.debit) || !Number.isInteger(entry.credit)) {
        throw new BadRequestException('Debit and credit amounts in Rupiah must be integers');
      }

      if (entry.debit < 0 || entry.credit < 0) {
        throw new BadRequestException('Debit and credit amounts cannot be negative');
      }

      if (entry.debit === 0 && entry.credit === 0) {
        throw new BadRequestException('Ledger entry must have either positive debit or credit');
      }

      if (entry.debit > 0 && entry.credit > 0) {
        throw new BadRequestException('Ledger entry cannot have both debit and credit greater than zero');
      }

      totalDebit += entry.debit;
      totalCredit += entry.credit;
    }

    // 4. Strict Balanced Double-Entry Constraint: SUM(debit) === SUM(credit)
    if (totalDebit !== totalCredit) {
      this.logger.error(
        `Ledger integrity check failed! SUM(debit)=${totalDebit} != SUM(credit)=${totalCredit}`
      );
      throw new UnbalancedLedgerException(totalDebit, totalCredit);
    }

    // 5. Atomic persist
    const txId = crypto.randomUUID();
    const now = new Date().toISOString();

    const transaction: LedgerTransaction = {
      id: txId,
      referenceType,
      referenceId,
      description,
      createdAt: now,
    };

    const savedEntries: LedgerEntry[] = entries.map((e) => ({
      id: crypto.randomUUID(),
      transactionId: txId,
      accountId: e.accountId,
      debit: e.debit,
      credit: e.credit,
      createdAt: now,
    }));

    this.transactions.set(txId, transaction);
    this.transactionByRef.set(refKey, txId);
    this.entries.push(...savedEntries);

    this.logger.log(
      `Ledger transaction ${txId} recorded: ${description} (Balanced at Rp ${totalDebit})`
    );

    return { transaction, entries: savedEntries };
  }

  getTransaction(id: string): LedgerTransaction | undefined {
    return this.transactions.get(id);
  }

  getEntriesForTransaction(transactionId: string): LedgerEntry[] {
    return this.entries.filter((e) => e.transactionId === transactionId);
  }

  getEntriesForAccount(accountId: string): LedgerEntry[] {
    return this.entries.filter((e) => e.accountId === accountId);
  }

  /**
   * Calculate balance for an account
   * DRIVER_PAYABLE (Liability): Credit increases, Debit decreases => balance = credit - debit
   * PLATFORM_REVENUE (Revenue): Credit increases => balance = credit - debit
   * PAYMENT_CLEARING (Asset/Clearing): Debit increases => balance = debit - credit
   * CASH_RECEIVABLE (Asset): Debit increases => balance = debit - credit
   * REFUND_PAYABLE (Liability): Credit increases => balance = credit - debit
   */
  getAccountBalance(accountId: string): {
    accountId: string;
    code: string;
    type: LedgerAccountType;
    totalDebit: number;
    totalCredit: number;
    balance: number;
  } {
    const account = this.getAccountById(accountId);
    const accountEntries = this.entries.filter((e) => e.accountId === accountId);

    const totalDebit = accountEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = accountEntries.reduce((sum, e) => sum + e.credit, 0);

    let balance = 0;
    if (account.type === 'DRIVER_PAYABLE' || account.type === 'PLATFORM_REVENUE' || account.type === 'REFUND_PAYABLE') {
      balance = totalCredit - totalDebit;
    } else {
      balance = totalDebit - totalCredit;
    }

    return {
      accountId: account.id,
      code: account.code,
      type: account.type,
      totalDebit,
      totalCredit,
      balance,
    };
  }

  /**
   * Verify all transactions in ledger are balanced (System Auditor)
   */
  auditAllTransactions(): { totalTransactions: number; totalEntries: number; balanced: boolean } {
    let balanced = true;
    for (const tx of this.transactions.values()) {
      const txEntries = this.getEntriesForTransaction(tx.id);
      const debit = txEntries.reduce((s, e) => s + e.debit, 0);
      const credit = txEntries.reduce((s, e) => s + e.credit, 0);
      if (debit !== credit) {
        balanced = false;
        this.logger.error(`Audit failed on transaction ${tx.id}: debit=${debit}, credit=${credit}`);
      }
    }
    return {
      totalTransactions: this.transactions.size,
      totalEntries: this.entries.length,
      balanced,
    };
  }

  /**
   * For test reset/isolation
   */
  clear() {
    this.accounts.clear();
    this.accountByCode.clear();
    this.transactions.clear();
    this.transactionByRef.clear();
    this.entries = [];
    this.seedSystemAccounts();
  }
}
