import { Injectable, signal, computed } from '@angular/core';
import {
  FamilyMember,
  FamilyPermission,
  FamilyTransaction,
  FamilyTransactionType,
} from '../../models';
import { AccountService } from './account.service';

const MEMBER_COLORS = ['#6c5ce7', '#00d68f', '#0984e3', '#e17055', '#ffa94d', '#a29bfe', '#fd79a8', '#00cec9'];

@Injectable({ providedIn: 'root' })
export class FamilyService {
  private readonly members = signal<FamilyMember[]>([]);
  private readonly transactions = signal<FamilyTransaction[]>([]);

  readonly allMembers = this.members.asReadonly();
  readonly allTransactions = this.transactions.asReadonly();

  readonly totalGiven = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'give' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amountUZS, 0)
  );

  readonly totalReceived = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'receive' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amountUZS, 0)
  );

  readonly totalFamilyDebt = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'debt' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amountUZS, 0)
  );

  readonly recentTransactions = computed(() =>
    [...this.transactions()]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  );

  constructor(private readonly accountService: AccountService) {}

  addMember(name: string, relation: string, permissions: FamilyPermission[]): void {
    const initial = name.trim().charAt(0).toUpperCase();
    const colorIndex = this.members().length % MEMBER_COLORS.length;
    const member: FamilyMember = {
      id: `fam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      initial,
      name: name.trim(),
      relation: relation.trim(),
      color: MEMBER_COLORS[colorIndex],
      permissions,
    };
    this.members.update((list) => [...list, member]);
  }

  removeMember(id: string): void {
    this.members.update((list) => list.filter((m) => m.id !== id));
  }

  updatePermissions(memberId: string, permissions: FamilyPermission[]): void {
    this.members.update((list) =>
      list.map((m) => (m.id === memberId ? { ...m, permissions } : m))
    );
  }

  getMemberById(id: string): FamilyMember | undefined {
    return this.members().find((m) => m.id === id);
  }

  /** Give money to a family member (deduct from your account) */
  giveMoney(memberId: string, amountUZS: number, accountId: string, note?: string): boolean {
    const member = this.getMemberById(memberId);
    if (!member || !member.permissions.includes('give')) return false;

    const deducted = this.accountService.deductBalance(accountId, amountUZS);
    if (!deducted) return false;

    this.addTransaction(memberId, 'give', amountUZS, accountId, note);
    return true;
  }

  /** Receive money from a family member (add to your account) */
  receiveMoney(memberId: string, amountUZS: number, accountId: string, note?: string): boolean {
    const member = this.getMemberById(memberId);
    if (!member || !member.permissions.includes('receive')) return false;

    this.accountService.updateBalance(accountId, amountUZS);
    this.addTransaction(memberId, 'receive', amountUZS, accountId, note);
    return true;
  }

  /** Record a debt from family member */
  recordDebt(memberId: string, amountUZS: number, accountId: string, note?: string): boolean {
    const member = this.getMemberById(memberId);
    if (!member || !member.permissions.includes('debt')) return false;

    this.accountService.updateBalance(accountId, amountUZS);
    this.addTransaction(memberId, 'debt', amountUZS, accountId, note);
    return true;
  }

  settleDebt(transactionId: string): void {
    this.transactions.update((list) =>
      list.map((t) =>
        t.id === transactionId ? { ...t, status: 'completed' as const } : t
      )
    );
  }

  getTransactionsForMember(memberId: string): FamilyTransaction[] {
    return this.transactions().filter((t) => t.memberId === memberId);
  }

  getMemberBalance(memberId: string): number {
    return this.transactions()
      .filter((t) => t.memberId === memberId)
      .reduce((sum, t) => {
        if (t.type === 'receive' || t.type === 'debt') return sum + t.amountUZS;
        if (t.type === 'give') return sum - t.amountUZS;
        return sum;
      }, 0);
  }

  private addTransaction(
    memberId: string,
    type: FamilyTransactionType,
    amountUZS: number,
    accountId: string,
    note?: string,
  ): void {
    const tx: FamilyTransaction = {
      id: `ftx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      memberId,
      type,
      amountUZS: Math.max(amountUZS, 0),
      accountId,
      note,
      status: type === 'debt' ? 'pending' : 'completed',
      date: new Date(),
      createdAt: new Date(),
    };
    this.transactions.update((list) => [...list, tx]);
  }
}
