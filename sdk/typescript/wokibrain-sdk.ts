export interface WokiBrainConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

export interface DiscoverSeatsParams {
  restaurantId: string;
  sectorId: string;
  date: string;
  partySize: number;
  duration: number;
  windowStart?: string;
  windowEnd?: string;
  limit?: number;
}

export interface CreateBookingParams {
  restaurantId: string;
  sectorId: string;
  partySize: number;
  durationMinutes: number;
  date: string;
  windowStart?: string;
  windowEnd?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

export interface Booking {
  id: string;
  restaurantId: string;
  sectorId: string;
  tableIds: string[];
  partySize: number;
  start: string;
  end: string;
  durationMinutes: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  kind: 'single' | 'combo';
  tableIds: string[];
  start: string;
  end: string;
  score?: number;
}

export interface DiscoveryResult {
  slotMinutes: number;
  durationMinutes: number;
  candidates: Candidate[];
}

export class WokiBrainSDK {
  private apiKey: string;
  private baseURL: string;
  private timeout: number;

  constructor(config: WokiBrainConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://wokibrain.grgcrew.com/api/v1';
    this.timeout = config.timeout || 30000;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: string; detail?: string };
      throw new WokiBrainError(
        error.error || 'UNKNOWN_ERROR',
        error.detail || 'An error occurred',
        response.status
      );
    }

    return (await response.json()) as T;
  }

  async discoverSeats(params: DiscoverSeatsParams): Promise<DiscoveryResult> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<DiscoveryResult>(`/woki/discover?${query}`);
  }

  async createBooking(params: CreateBookingParams, idempotencyKey?: string): Promise<Booking> {
    return this.request<Booking>('/woki/bookings', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(params),
    });
  }

  async getBooking(bookingId: string): Promise<Booking> {
    return this.request<Booking>(`/woki/bookings/${bookingId}`);
  }

  async cancelBooking(bookingId: string, idempotencyKey?: string): Promise<void> {
    await this.request(`/woki/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
  }

  async listBookings(params: {
    restaurantId: string;
    sectorId: string;
    date: string;
  }): Promise<{ date: string; bookings: Booking[] }> {
    const query = new URLSearchParams(params).toString();
    return this.request(`/woki/bookings?${query}`);
  }
}

export class WokiBrainError extends Error {
  constructor(
    public code: string,
    public detail: string,
    public statusCode: number
  ) {
    super(detail);
    this.name = 'WokiBrainError';
  }
}
