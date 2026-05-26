export interface Medicine {
  id: number;
  name: string;
  description: string;
  status: string;
  type: string;
  price: number;
  quantity: number;
  relatedUserId: number;
  pharmacistName: string;
  createdAt: string;
}

export interface MedicineRequest {
  name: string;
  description: string;
  status: string;
  type: string;
  price: number;
  quantity: number;
  relatedUserId: number;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
}

export interface DashboardSummary {
  totalItems: number;
  available: number;
  lowStock: number;
  outOfStock: number;
  inventoryValue: number;
  byType: CategoryCount[];
}

export interface CategoryCount {
  type: string;
  count: number;
}
