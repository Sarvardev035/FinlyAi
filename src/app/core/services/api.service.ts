import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AccountPayload {
  name: string;
  type: string;
  currency: string;
  initialBalance?: number;
  cardNumber?: string | null;
  cardType?: string | null;
  expiryDate?: string | null;
}

export interface ExpensePayload {
  amount: number;
  currency?: string;
  description: string;
  expenseDate: string;        // ISO date: "2026-03-05"
  categoryId: string;
  accountId: string;
}

export interface IncomePayload {
  amount: number;
  currency?: string;
  description: string;
  incomeDate: string;
  categoryId: string;
  accountId: string;
}

export interface BudgetPayload {
  categoryId?: string | null;
  type: string;
  monthlyLimit: number;
  year: number;
  month: number;
}

export interface DebtPayload {
  personName: string;
  type: 'DEBT' | 'RECEIVABLE';
  currency?: string;
  accountId?: string | null;
  amount: number;
  description?: string;
  dueDate: string;
}

export interface TransferPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  transferDate: string;
  exchangeRate?: number;
}

export interface RepayPayload {
  paymentAmount: number;
  accountId?: string | null;
}

/**
 * Base HTTP service that wraps every call with the backend's ApiResponse<T>
 * envelope.  The API URL comes from the environment so it can be overridden
 * per build target (development uses the Angular dev-server proxy, production
 * can point to the real host).
 *
 * Security:
 *  - Auth bearer token injection is handled by authInterceptor.
 *  - CSRF token is injected by csrfInterceptor.
 *  - No secrets are stored here; the service only constructs URLs/payloads.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ── Auth ─────────────────────────────────────────────────────────────────

  register(body: { fullName: string; email: string; password: string }): Observable<ApiResponse<AuthTokens>> {
    return this.http.post<ApiResponse<AuthTokens>>(`${this.base}/auth/register`, body);
  }

  login(body: { email: string; password: string }): Observable<ApiResponse<AuthTokens>> {
    return this.http.post<ApiResponse<AuthTokens>>(`${this.base}/auth/login`, body);
  }

  refreshToken(refreshToken: string): Observable<ApiResponse<AuthTokens>> {
    return this.http.post<ApiResponse<AuthTokens>>(`${this.base}/auth/token/refresh`, { refreshToken });
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  getMe(): Observable<ApiResponse<unknown>> {
    return this.http.get<ApiResponse<unknown>>(`${this.base}/users/me`);
  }

  // ── Accounts ─────────────────────────────────────────────────────────────

  getAccounts(): Observable<ApiResponse<unknown[]>> {
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/accounts`);
  }

  getAccount(id: string): Observable<ApiResponse<unknown>> {
    return this.http.get<ApiResponse<unknown>>(`${this.base}/accounts/${id}`);
  }

  createAccount(body: AccountPayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/accounts`, body);
  }

  updateAccount(id: string, body: Partial<AccountPayload>): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/accounts/${id}`, body);
  }

  deleteAccount(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/accounts/${id}`);
  }

  // ── Expenses ──────────────────────────────────────────────────────────────

  getExpenses(filters?: {
    accountId?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<ApiResponse<unknown[]>> {
    let params = new HttpParams();
    if (filters?.accountId)  params = params.set('accountId',  filters.accountId);
    if (filters?.categoryId) params = params.set('categoryId', filters.categoryId);
    if (filters?.startDate)  params = params.set('startDate',  filters.startDate);
    if (filters?.endDate)    params = params.set('endDate',    filters.endDate);
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/expenses`, { params });
  }

  createExpense(body: ExpensePayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/expenses`, body);
  }

  updateExpense(id: string, body: Partial<ExpensePayload>): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/expenses/${id}`, body);
  }

  deleteExpense(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/expenses/${id}`);
  }

  // ── Incomes ───────────────────────────────────────────────────────────────

  getIncomes(filters?: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<ApiResponse<unknown[]>> {
    let params = new HttpParams();
    if (filters?.accountId) params = params.set('accountId', filters.accountId);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate)   params = params.set('endDate',   filters.endDate);
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/incomes`, { params });
  }

  createIncome(body: IncomePayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/incomes`, body);
  }

  updateIncome(id: string, body: Partial<IncomePayload>): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.base}/incomes/${id}`, body);
  }

  deleteIncome(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/incomes/${id}`);
  }

  // ── Budgets ───────────────────────────────────────────────────────────────

  getBudgets(year: number, month: number): Observable<ApiResponse<unknown[]>> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/budgets`, { params });
  }

  createBudget(body: BudgetPayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/budgets`, body);
  }

  deleteBudget(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/budgets/${id}`);
  }

  // ── Debts ─────────────────────────────────────────────────────────────────

  getDebts(filters?: { type?: string; status?: string }): Observable<ApiResponse<unknown[]>> {
    let params = new HttpParams();
    if (filters?.type)   params = params.set('type',   filters.type);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/debts`, { params });
  }

  createDebt(body: DebtPayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/debts`, body);
  }

  repayDebt(id: string, body: RepayPayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/debts/${id}/repay`, body);
  }

  deleteDebt(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/debts/${id}`);
  }

  // ── Transfers ─────────────────────────────────────────────────────────────

  getTransfers(filters?: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<ApiResponse<unknown[]>> {
    let params = new HttpParams();
    if (filters?.accountId) params = params.set('accountId', filters.accountId);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate)   params = params.set('endDate',   filters.endDate);
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/transfers`, { params });
  }

  createTransfer(body: TransferPayload): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/transfers`, body);
  }

  deleteTransfer(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/transfers/${id}`);
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  getAnalyticsSummary(): Observable<ApiResponse<unknown>> {
    return this.http.get<ApiResponse<unknown>>(`${this.base}/analytics/summary`);
  }

  getDashboard(startDate?: string, endDate?: string): Observable<ApiResponse<unknown>> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate)   params = params.set('endDate',   endDate);
    return this.http.get<ApiResponse<unknown>>(`${this.base}/analytics/dashboard`, { params });
  }

  getExpensesByCategory(from?: string, to?: string): Observable<ApiResponse<unknown[]>> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to',   to);
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/analytics/expenses-by-category`, { params });
  }

  getMonthlyExpenses(from?: string, to?: string): Observable<ApiResponse<unknown[]>> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to',   to);
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/analytics/monthly-expenses`, { params });
  }

  getIncomeVsExpense(from?: string, to?: string): Observable<ApiResponse<unknown[]>> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to',   to);
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/analytics/income-vs-expense`, { params });
  }

  getAccountBalances(): Observable<ApiResponse<unknown[]>> {
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/analytics/account-balances`);
  }

  getCategoryStats(type = 'EXPENSE', startDate?: string, endDate?: string): Observable<ApiResponse<unknown[]>> {
    let params = new HttpParams().set('type', type);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate)   params = params.set('endDate',   endDate);
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/analytics/categories`, { params });
  }

  getTimeSeries(period: string, startDate?: string, endDate?: string): Observable<ApiResponse<unknown[]>> {
    let params = new HttpParams().set('period', period);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate)   params = params.set('endDate',   endDate);
    return this.http.get<ApiResponse<unknown[]>>(`${this.base}/analytics/timeseries`, { params });
  }
}
