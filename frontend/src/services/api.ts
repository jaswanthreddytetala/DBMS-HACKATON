import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("voltflow_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("voltflow_token");
      sessionStorage.removeItem("voltflow_user");
      window.dispatchEvent(new Event("voltflow:unauthorized"));
      return Promise.reject(new Error("Your session expired. Please sign in again."));
    }
    const responseData: unknown = error.response?.data;
    if (responseData && typeof responseData === "object") {
      const { message, fieldErrors } = responseData as {
        message?: unknown;
        fieldErrors?: Record<string, unknown>;
      };
      if (typeof message === "string" && fieldErrors && typeof fieldErrors === "object") {
        const details = Object.entries(fieldErrors)
          .filter((entry): entry is [string, string] => typeof entry[1] === "string")
          .map(([field, detail]) => `${field}: ${detail}`)
          .join("; ");
        return Promise.reject(new Error(details ? `${message} ${details}` : message));
      }
      if (typeof message === "string" && message) return Promise.reject(new Error(message));
    }
    if (error.response?.status === 403) {
      return Promise.reject(new Error("You do not have permission to perform this action."));
    }
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("The VoltFlow API request timed out. Check that the backend is running."));
    }
    if (error.response) {
      return Promise.reject(new Error(`The VoltFlow API returned HTTP ${error.response.status}.`));
    }
    return Promise.reject(new Error("Could not reach the VoltFlow API. Check that the backend is running on port 8080."));
  },
);

export type AuthResponse = {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "DRIVER";
};

export type AuthProfile = Omit<AuthResponse, "token">;

export const authApi = {
  login: (email: string, password: string) => api.post<AuthResponse>("/auth/login", { email, password }),
  register: (payload: { fullName: string; email: string; password: string }) => api.post<AuthResponse>("/auth/register", payload),
  me: () => api.get<AuthProfile>("/auth/me"),
};

export type HealthResponse = { status: "UP" | "DOWN"; database: "UP" | "DOWN"; timestamp: string };

export const healthApi = {
  get: () => api.get<HealthResponse>("/health"),
};

export type ManagedUser = {
  id: number;
  fullName: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "DRIVER";
  enabled: boolean;
  createdAt: string;
};

export const usersApi = {
  list: () => api.get<ManagedUser[]>("/users"),
  update: (id: number, user: Pick<ManagedUser, "fullName" | "role" | "enabled">) => api.put<ManagedUser>(`/users/${id}`, user),
  remove: (id: number) => api.delete(`/users/${id}`),
};

export const stationApi = {
  list: (query = "") => api.get("/stations", { params: query ? { q: query } : {} }),
  get: (id: number) => api.get(`/stations/${id}`),
  create: (payload: unknown) => api.post("/stations", payload),
  update: (id: number, payload: unknown) => api.put(`/stations/${id}`, payload),
  remove: (id: number) => api.delete(`/stations/${id}`),
};

export const bookingApi = {
  create: (payload: { chargerId: number; scheduledAt: string }) => api.post("/bookings", payload),
  list: () => api.get<BookingRecord[]>("/bookings"),
  cancel: (id: number) => api.put<BookingRecord>(`/bookings/${id}/cancel`),
};

export type BookingRecord = {
  id: number;
  chargerId: number;
  chargerCode: string;
  stationName: string;
  scheduledAt: string;
  status: "BOOKED" | "CHARGING" | "COMPLETED" | "CANCELLED";
};

export type SessionRecord = {
  id: number;
  bookingId: number | null;
  chargerId: number;
  chargerCode: string;
  stationName: string;
  startedAt: string;
  endedAt: string | null;
  energyKwh: number;
  totalCost: number;
  status: "BOOKED" | "CHARGING" | "COMPLETED" | "CANCELLED";
};

export const sessionApi = {
  list: () => api.get<SessionRecord[]>("/sessions"),
  start: (bookingId: number) => api.post<SessionRecord>("/sessions/start", { bookingId }),
  stop: (id: number, energyKwh: number) => api.post<SessionRecord>(`/sessions/${id}/stop`, { energyKwh }),
};

export type AnalyticsOverview = {
  stations: number;
  chargers: number;
  activeSessions: number;
  completedSessions: number;
  users: number;
  availableChargers: number;
  occupiedChargers: number;
  offlineChargers: number;
  energyKwh: number;
  revenue: number;
};

export const analyticsApi = {
  overview: () => api.get<AnalyticsOverview>("/analytics/overview"),
  sessions: () => api.get<SessionRecord[]>("/analytics/sessions"),
};
