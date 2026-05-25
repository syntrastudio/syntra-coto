import Cookies from 'js-cookie';
import type {
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  User,
  Property,
  Resident,
  MonthlyFee,
  Payment,
  Vehicle,
  DashboardStats,
  CreatePropertyInput,
  CreateResidentInput,
  UpdateResidentInput,
  CreatePaymentInput,
  GenerateFeesInput,
  CreateVehicleInput,
  UpdateVehicleInput,
  PropertyFilters,
  ResidentFilters,
  FeeFilters,
  PaymentFilters,
  VehicleFilters,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://syntra-coto-api.lcdla-scheduler.workers.dev';
const TOKEN_KEY = 'syntra_token';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | undefined {
    return Cookies.get(TOKEN_KEY);
  }

  private setToken(token: string): void {
    Cookies.set(TOKEN_KEY, token, { expires: 7 }); // 7 días
  }

  private removeToken(): void {
    Cookies.remove(TOKEN_KEY);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error en la petición');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error desconocido en la petición');
    }
  }

  // Autenticación
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data.access_token) {
      this.setToken(response.data.access_token);
    }

    return response;
  }

  async logout(): Promise<void> {
    this.removeToken();
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/api/auth/me');
  }

  // Propiedades
  async getProperties(
    page: number = 1,
    limit: number = 10,
    filters?: PropertyFilters
  ): Promise<PaginatedResponse<Property>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.street) params.append('street', filters.street);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    return this.request<PaginatedResponse<Property>>(
      `/api/properties?${params.toString()}`
    );
  }

  async getProperty(id: string): Promise<ApiResponse<Property>> {
    return this.request<ApiResponse<Property>>(`/api/properties/${id}`);
  }

  async createProperty(data: CreatePropertyInput): Promise<ApiResponse<Property>> {
    return this.request<ApiResponse<Property>>('/api/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProperty(id: string, data: Partial<CreatePropertyInput>): Promise<ApiResponse<Property>> {
    return this.request<ApiResponse<Property>>(`/api/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProperty(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/properties/${id}`, {
      method: 'DELETE',
    });
  }

  // Residentes
  async getResidents(
    page: number = 1,
    limit: number = 10,
    filters?: ResidentFilters
  ): Promise<PaginatedResponse<Resident>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    return this.request<PaginatedResponse<Resident>>(
      `/api/residents?${params.toString()}`
    );
  }

  async getResident(id: string): Promise<ApiResponse<Resident>> {
    return this.request<ApiResponse<Resident>>(`/api/residents/${id}`);
  }

  async getResidentsByProperty(propertyId: string): Promise<ApiResponse<Resident[]>> {
    return this.request<ApiResponse<Resident[]>>(`/api/properties/${propertyId}/residents`);
  }

  async createResident(data: CreateResidentInput): Promise<ApiResponse<Resident>> {
    return this.request<ApiResponse<Resident>>('/api/residents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateResident(id: string, data: UpdateResidentInput): Promise<ApiResponse<Resident>> {
    return this.request<ApiResponse<Resident>>(`/api/residents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteResident(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/residents/${id}`, {
      method: 'DELETE',
    });
  }

  // Cuotas
  async getFees(
    page: number = 1,
    limit: number = 10,
    filters?: FeeFilters
  ): Promise<PaginatedResponse<MonthlyFee>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.property_id) params.append('property_id', filters.property_id);
    if (filters?.period) params.append('period', filters.period);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);

    return this.request<PaginatedResponse<MonthlyFee>>(
      `/api/fees?${params.toString()}`
    );
  }

  async getFee(id: string): Promise<ApiResponse<MonthlyFee>> {
    return this.request<ApiResponse<MonthlyFee>>(`/api/fees/${id}`);
  }

  async getFeesByProperty(propertyId: string): Promise<ApiResponse<MonthlyFee[]>> {
    return this.request<ApiResponse<MonthlyFee[]>>(`/api/properties/${propertyId}/fees`);
  }

  async generateFees(data: GenerateFeesInput): Promise<ApiResponse<{ count: number }>> {
    return this.request<ApiResponse<{ count: number }>>('/api/fees/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFee(id: string, data: Partial<MonthlyFee>): Promise<ApiResponse<MonthlyFee>> {
    return this.request<ApiResponse<MonthlyFee>>(`/api/fees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Pagos
  async getPayments(
    page: number = 1,
    limit: number = 10,
    filters?: PaymentFilters
  ): Promise<PaginatedResponse<Payment>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.property_id) params.append('property_id', filters.property_id);
    if (filters?.payment_method) params.append('payment_method', filters.payment_method);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);

    return this.request<PaginatedResponse<Payment>>(
      `/api/payments?${params.toString()}`
    );
  }

  async getPayment(id: string): Promise<ApiResponse<Payment>> {
    return this.request<ApiResponse<Payment>>(`/api/payments/${id}`);
  }

  async getPaymentsByProperty(propertyId: string): Promise<ApiResponse<Payment[]>> {
    return this.request<ApiResponse<Payment[]>>(`/api/properties/${propertyId}/payments`);
  }

  async createPayment(data: CreatePaymentInput): Promise<ApiResponse<Payment>> {
    return this.request<ApiResponse<Payment>>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<ApiResponse<DashboardStats>>('/api/dashboard/stats');
  }

  // Vehículos
  async getVehicles(
    page: number = 1,
    limit: number = 10,
    filters?: VehicleFilters
  ): Promise<PaginatedResponse<Vehicle>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.property_id) params.append('property_id', filters.property_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    return this.request<PaginatedResponse<Vehicle>>(
      `/api/vehicles?${params.toString()}`
    );
  }

  async getVehicle(id: string): Promise<ApiResponse<Vehicle>> {
    return this.request<ApiResponse<Vehicle>>(`/api/vehicles/${id}`);
  }

  async getVehiclesByProperty(propertyId: string): Promise<ApiResponse<Vehicle[]>> {
    return this.request<ApiResponse<Vehicle[]>>(`/api/properties/${propertyId}/vehicles`);
  }

  async createVehicle(data: CreateVehicleInput): Promise<ApiResponse<Vehicle>> {
    return this.request<ApiResponse<Vehicle>>('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVehicle(id: string, data: UpdateVehicleInput): Promise<ApiResponse<Vehicle>> {
    return this.request<ApiResponse<Vehicle>>(`/api/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVehicle(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/vehicles/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;

// Made with Bob
