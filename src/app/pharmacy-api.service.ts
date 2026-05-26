import { Injectable } from '@angular/core';
import { DashboardSummary, Medicine, MedicineRequest, User } from './models';

@Injectable({ providedIn: 'root' })
export class PharmacyApiService {
  private readonly baseUrl = '/api';

  getMedicines() {
    return this.request<Medicine[]>('/items');
  }

  createMedicine(request: MedicineRequest) {
    return this.request<Medicine>('/items', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  updateMedicine(id: number, request: MedicineRequest) {
    return this.request<Medicine>(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request)
    });
  }

  deleteMedicine(id: number) {
    return this.request<void>(`/items/${id}`, { method: 'DELETE' });
  }

  getUsers() {
    return this.request<User[]>('/users');
  }

  getSummary() {
    return this.request<DashboardSummary>('/dashboard/summary');
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}
