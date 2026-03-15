import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Person } from '../../models/person.model';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

@Injectable({ providedIn: 'root' })
export class PersonService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // Get all persons
  getPersons(): Observable<Person[]> {
    return this.http.get<Person[] | ApiEnvelope<unknown[]>>(`${this.base}/persons`).pipe(
      map((res) => this.mapPersons(this.unwrapArray(res)))
    );
  }

  // Create new person
  createPerson(person: { name: string; avatar: string }): Observable<Person> {
    return this.http.post<Person | ApiEnvelope<unknown>>(`${this.base}/persons`, person).pipe(
      map((res) => this.mapPerson(this.unwrapOne(res)))
    );
  }

  // Delete person
  deletePerson(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/persons/${id}`);
  }

  // Get person expenses
  getPersonExpenses(personId: string): Observable<unknown[]> {
    return this.http.get<unknown[] | ApiEnvelope<unknown[]>>(`${this.base}/persons/${personId}/expenses`).pipe(
      map((res) => this.unwrapArray(res))
    );
  }

  // Add expense for person
  addPersonExpense(personId: string, expense: unknown): Observable<unknown> {
    return this.http.post(`${this.base}/persons/${personId}/expenses`, expense);
  }

  private unwrapArray(res: unknown[] | ApiEnvelope<unknown[]>): unknown[] {
    if (Array.isArray(res)) return res;
    return Array.isArray(res?.data) ? res.data : [];
  }

  private unwrapOne(res: unknown | ApiEnvelope<unknown>): unknown {
    if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) {
      return (res as ApiEnvelope<unknown>).data ?? {};
    }
    return res;
  }

  private mapPersons(rows: unknown[]): Person[] {
    return rows.map((row) => this.mapPerson(row));
  }

  private mapPerson(raw: unknown): Person {
    const row = (raw ?? {}) as Record<string, unknown>;
    return {
      id: String(row['id'] ?? `person_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
      name: String(row['name'] ?? 'Unnamed'),
      avatar: String(row['avatar'] ?? '👤'),
      walletId: row['walletId'] != null ? String(row['walletId']) : undefined,
      balance: Number(row['balance'] ?? 0),
      createdAt: row['createdAt'] ? new Date(String(row['createdAt'])) : new Date(),
    };
  }
}
