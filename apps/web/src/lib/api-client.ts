import Cookies from 'js-cookie';
import type {
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  User,
  AuditLog,
  SystemSetting,
  Property,
  Resident,
  MonthlyFee,
  Payment,
  Vehicle,
  DashboardStats,
  CreatePropertyInput,
  CreateResidentInput,
  UpdateResidentInput,
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

/**
 * Extrae un mensaje legible del cuerpo de error del backend. Soporta:
 *   - error como string
 *   - error de Zod ({ issues: [{ path, message }] })
 *   - message como fallback
 */
function extractErrorMessage(data: any): string {
  const err = data?.error;
  if (typeof err === 'string') return err;
  if (err && Array.isArray(err.issues)) {
    return err.issues
      .map((i: any) => {
        const field = Array.isArray(i.path) && i.path.length > 0 ? i.path.join('.') : '';
        return field ? `${field}: ${i.message}` : i.message;
      })
      .join(' · ');
  }
  if (err && typeof err === 'object') {
    try { return JSON.stringify(err); } catch {}
  }
  if (typeof data?.message === 'string') return data.message;
  return 'Error en la petición';
}

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
        throw new Error(extractErrorMessage(data));
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
  async login(credentials: LoginRequest | { identifier: string; password: string }): Promise<LoginResponse> {
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

  async createPayment(data: {
    monthly_fee_id?: string;
    property_id?: string;
    amount: number;
    payment_method: 'cash' | 'transfer' | 'card' | 'check' | 'stripe' | 'mercadopago';
    payment_reference?: string;
    payment_date: number;
    notes?: string;
  }): Promise<ApiResponse<Payment>> {
    return this.request<ApiResponse<Payment>>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createAnnualPayment(data: {
    property_id: string;
    year: number;
    payment_method: 'cash' | 'transfer' | 'card' | 'check' | 'stripe' | 'mercadopago';
    payment_reference?: string;
    payment_date: number;
    notes?: string;
  }): Promise<ApiResponse<{ payment: Payment; charged: number; bonus_months: number; fees_paid: number }>> {
    return this.request('/api/payments/annual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPropertyPendingFees(propertyId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/api/fees/property/${propertyId}`);
  }

  // Acciones administrativas (botones manuales)
  async generateCurrentMonthFees(): Promise<ApiResponse<{ period: string; base_amount: number; generated: number; skipped: number; auto_paid_with_credit: number; errors: string[] }>> {
    return this.request('/api/fees/generate-current', { method: 'POST', body: '{}' });
  }

  async applyLateFees(): Promise<ApiResponse<{ applied: number; skipped_already_charged: number; total_surcharge: number }>> {
    return this.request('/api/fees/apply-late-fees', { method: 'POST', body: '{}' });
  }

  async recalculateDelinquency(): Promise<ApiResponse<{ scanned: number; updated: number; by_status: Record<string, number> }>> {
    return this.request('/api/fees/recalculate-delinquency', { method: 'POST', body: '{}' });
  }

  async runFullCycle(): Promise<ApiResponse<any>> {
    return this.request('/api/admin/run-cycle', { method: 'POST', body: '{}' });
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

  // Catálogo de marcas/modelos (API pública con caché en el worker)
  async getVehicleMakes(type: 'car' | 'motorcycle' = 'car'): Promise<ApiResponse<string[]>> {
    return this.request<ApiResponse<string[]>>(`/api/vehicles/makes?type=${type}`);
  }
  async getVehicleModels(make: string): Promise<ApiResponse<string[]>> {
    return this.request<ApiResponse<string[]>>(`/api/vehicles/models/${encodeURIComponent(make)}`);
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

  // Usuarios admin
  async getUsers(filters?: { role?: string; status?: string; search?: string }): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    const qs = params.toString();
    const raw = await this.request<{ success: boolean; data: { users: User[]; total: number; page: number; limit: number } }>(
      `/api/users${qs ? '?' + qs : ''}`
    );
    return {
      success: raw.success,
      data: raw.data.users,
      pagination: {
        page: raw.data.page,
        limit: raw.data.limit,
        total: raw.data.total,
        totalPages: Math.ceil(raw.data.total / raw.data.limit),
      },
    };
  }

  async createUser(data: {
    resident_id?: string;
    email?: string;
    password?: string;
    full_name?: string;
    phone?: string;
    role: User['role'];
  }): Promise<ApiResponse<{ userId: string; email_sent: boolean; email_skipped?: boolean }>> {
    return this.request<ApiResponse<{ userId: string; email_sent: boolean; email_skipped?: boolean }>>(
      '/api/users',
      { method: 'POST', body: JSON.stringify(data) }
    );
  }

  async getAvailableResidents(): Promise<ApiResponse<Array<{ id: string; full_name: string; email: string; phone: string; type: string }>>> {
    return this.request<ApiResponse<Array<{ id: string; full_name: string; email: string; phone: string; type: string }>>>(
      '/api/users/available-residents'
    );
  }

  async updateUser(id: string, data: Partial<{ full_name: string; phone: string; role: User['role']; status: User['status']; }>): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/api/users/${id}`, { method: 'DELETE' });
  }

  async resetUserPassword(id: string, opts?: { password?: string; send_email?: boolean }): Promise<ApiResponse<{ email_sent: boolean; email_skipped?: boolean; temp_password?: string }>> {
    return this.request(`/api/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(opts || {}),
    });
  }

  // Mesa directiva / Caja
  async getMesaBalances(): Promise<ApiResponse<Array<{ id: string; full_name: string; email: string; role: string; balance: number; movements_count: number; last_movement_at: number | null }>>> {
    return this.request('/api/mesa/balances');
  }

  async getMemberDetail(userId: string): Promise<ApiResponse<{ user: any; balance: number; movements: any[] }>> {
    return this.request(`/api/mesa/balance/${userId}`);
  }

  async depositToBank(data: { user_id: string; amount: number; notes?: string }): Promise<ApiResponse<{ balance: number }>> {
    return this.request('/api/mesa/deposit', { method: 'POST', body: JSON.stringify(data) });
  }

  async transferBetweenMembers(data: { from_user_id: string; to_user_id: string; amount: number; notes?: string }): Promise<ApiResponse<{ ok: boolean }>> {
    return this.request('/api/mesa/transfer', { method: 'POST', body: JSON.stringify(data) });
  }

  // Audit logs
  async getAuditLogs(filters?: { user_id?: string; entity_type?: string; action?: string; page?: number; limit?: number }): Promise<PaginatedResponse<AuditLog>> {
    const params = new URLSearchParams();
    if (filters?.user_id) params.append('user_id', filters.user_id);
    if (filters?.entity_type) params.append('entity_type', filters.entity_type);
    if (filters?.action) params.append('action', filters.action);
    params.append('page', String(filters?.page ?? 1));
    params.append('limit', String(filters?.limit ?? 50));
    const raw = await this.request<{ success: boolean; data: { logs: AuditLog[]; total: number; page: number; limit: number } }>(
      `/api/audit-logs?${params.toString()}`
    );
    return {
      success: raw.success,
      data: raw.data.logs,
      pagination: {
        page: raw.data.page,
        limit: raw.data.limit,
        total: raw.data.total,
        totalPages: Math.ceil(raw.data.total / raw.data.limit),
      },
    };
  }

  // Settings
  async getSettings(category?: string): Promise<ApiResponse<SystemSetting[]>> {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request<ApiResponse<SystemSetting[]>>(`/api/settings${qs}`);
  }

  async updateSetting(key: string, value: any): Promise<ApiResponse<SystemSetting>> {
    return this.request<ApiResponse<SystemSetting>>(`/api/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  // Cámaras
  async getCameras(): Promise<ApiResponse<any[]>> {
    return this.request('/api/cameras');
  }
  async getCamera(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/cameras/${id}`);
  }
  async createCamera(data: any): Promise<ApiResponse<any>> {
    return this.request('/api/cameras', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateCamera(id: string, data: any): Promise<ApiResponse<any>> {
    return this.request(`/api/cameras/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
  async deleteCamera(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/cameras/${id}`, { method: 'DELETE' });
  }

  // Tickets
  async getTickets(opts?: { status?: string; category?: string; page?: number; limit?: number }): Promise<ApiResponse<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
    const params = new URLSearchParams();
    if (opts?.status) params.append('status', opts.status);
    if (opts?.category) params.append('category', opts.category);
    if (opts?.page) params.append('page', String(opts.page));
    if (opts?.limit) params.append('limit', String(opts.limit));
    return this.request(`/api/tickets?${params.toString()}`);
  }
  async getTicket(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/tickets/${id}`);
  }
  async createTicket(data: { title: string; description: string; category?: string; priority?: string; property_id?: string }): Promise<ApiResponse<any>> {
    return this.request('/api/tickets', { method: 'POST', body: JSON.stringify(data) });
  }
  async updateTicket(id: string, data: { status?: string; priority?: string; category?: string; assigned_to?: string | null; title?: string; description?: string }): Promise<ApiResponse<any>> {
    return this.request(`/api/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
  async commentTicket(id: string, body: string, isInternal = false): Promise<ApiResponse<any>> {
    return this.request(`/api/tickets/${id}/comments`, { method: 'POST', body: JSON.stringify({ body, is_internal: isInternal }) });
  }

  // Asistente del reglamento
  async getAssistantUsage(): Promise<ApiResponse<{ enabled: boolean; used_neurons: number; limit_neurons: number; percentage_used: number; available: boolean; total_queries_today: number; blocked_today: number }>> {
    return this.request('/api/assistant/usage');
  }

  async askAssistant(question: string): Promise<ApiResponse<{ answer: string; tokens_input: number; tokens_output: number; neurons: number; elapsed_ms: number }>> {
    return this.request('/api/assistant/ask', { method: 'POST', body: JSON.stringify({ question }) });
  }

  // Asistente de uso de la app ("¿cómo hago X?")
  async askHelp(question: string): Promise<ApiResponse<{ answer: string; neurons: number; elapsed_ms: number }>> {
    return this.request('/api/assistant/help', { method: 'POST', body: JSON.stringify({ question }) });
  }

  // ----- Terraza (apartado de área común) -----
  async getTerraceInfo(): Promise<ApiResponse<{ reservation_fee: number; deposit_amount: number; deposit_return: number }>> {
    return this.request('/api/terrace/info');
  }
  async getTerraceTakenDates(): Promise<ApiResponse<string[]>> {
    return this.request('/api/terrace/taken-dates');
  }
  async getTerraceReservations(status?: string): Promise<ApiResponse<any[]>> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/api/terrace${q}`);
  }
  async createTerraceReservation(data: { property_id?: string; event_date: string; event_type?: string; guests_estimate?: number; resident_notes?: string }): Promise<ApiResponse<any>> {
    return this.request('/api/terrace', { method: 'POST', body: JSON.stringify(data) });
  }
  async cancelTerraceReservation(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/terrace/${id}/cancel`, { method: 'POST', body: JSON.stringify({}) });
  }
  async approveTerrace(id: string, data: { reservation_fee?: number; deposit_amount?: number; payment_instructions?: string; admin_notes?: string }): Promise<ApiResponse<any>> {
    return this.request(`/api/terrace/${id}/approve`, { method: 'POST', body: JSON.stringify(data) });
  }
  async rejectTerrace(id: string, reason?: string): Promise<ApiResponse<any>> {
    return this.request(`/api/terrace/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
  }
  async markTerracePaid(id: string, data: { payment_method: string; payment_reference?: string; received_by_user_id?: string }): Promise<ApiResponse<any>> {
    return this.request(`/api/terrace/${id}/mark-paid`, { method: 'POST', body: JSON.stringify(data) });
  }
  async returnTerraceDeposit(id: string, data: { returned_amount: number; method?: string; admin_notes?: string }): Promise<ApiResponse<any>> {
    return this.request(`/api/terrace/${id}/return-deposit`, { method: 'POST', body: JSON.stringify(data) });
  }

  // ----- Boletín oficial -----
  async getBulletinRecipients(): Promise<ApiResponse<Array<{ id: string; full_name: string; email: string; house_number?: string; street?: string }>>> {
    return this.request('/api/bulletins/recipients');
  }
  async getBulletins(): Promise<ApiResponse<any[]>> {
    return this.request('/api/bulletins');
  }
  async improveBulletin(text: string): Promise<ApiResponse<{ improved: string }>> {
    return this.request('/api/bulletins/improve', { method: 'POST', body: JSON.stringify({ text }) });
  }
  async sendBulletin(data: { subject: string; body: string; audience: 'all' | 'selected'; resident_ids?: string[]; signature?: string }): Promise<ApiResponse<{ id: string; folio: string; sent: number; failed: number; total: number }>> {
    return this.request('/api/bulletins', { method: 'POST', body: JSON.stringify(data) });
  }

  // ----- Solicitudes de acceso (interesados) -----
  async submitAccessRequest(data: { full_name: string; email: string; phone?: string; house_label?: string; message?: string }): Promise<ApiResponse<any>> {
    return this.request('/api/public/access-request', { method: 'POST', body: JSON.stringify(data) });
  }
  async getAccessRequests(): Promise<ApiResponse<any[]>> {
    return this.request('/api/public/access-requests');
  }
  async updateAccessRequestStatus(id: string, status: 'pendiente' | 'en_revision' | 'contactado' | 'descartado' | 'dado_de_alta'): Promise<ApiResponse<any>> {
    return this.request(`/api/public/access-requests/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
  }
  // Aprobar interesado → crear vecino. Devuelve el body crudo para manejar 409 (duplicados/advertencias).
  async approveAccessRequest(id: string, data: { full_name: string; email: string; phone: string; type: 'propietario' | 'inquilino'; property_id?: string; override?: boolean }): Promise<{ ok: boolean; status: number; body: any }> {
    const token = this.getToken();
    const r = await fetch(`${this.baseUrl}/api/public/access-requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data),
    });
    const body = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, body };
  }

  async getAssistantHistory(): Promise<ApiResponse<any[]>> {
    return this.request('/api/assistant/history');
  }

  // PDF del reglamento (devuelve Blob URL para usar en <iframe>)
  async getReglamentoPdfBlobUrl(): Promise<string> {
    const token = this.getToken();
    const r = await fetch(`${this.baseUrl}/api/assistant/reglamento.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) throw new Error('No se pudo cargar el reglamento');
    const blob = await r.blob();
    return URL.createObjectURL(blob);
  }

  async getNotificationsLog(opts?: { type?: string; page?: number; limit?: number }): Promise<ApiResponse<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
    const params = new URLSearchParams();
    if (opts?.type) params.append('type', opts.type);
    if (opts?.page) params.append('page', String(opts.page));
    if (opts?.limit) params.append('limit', String(opts.limit));
    return this.request(`/api/settings/notifications-log?${params.toString()}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;

// Made with Bob
