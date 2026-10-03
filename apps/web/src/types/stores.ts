export interface OpeningDay {
  open: string;
  close: string;
  isClosed: boolean;
}

export type OpeningHours = Record<string, OpeningDay | null>;

export interface Store {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  timezone: string;
  opening_hours: OpeningHours;
  is_suspended: boolean;
  isOpen?: boolean;
  updated_at?: string;
}

// Body for create/update, matching the backend's camelCase store schema.
export interface StorePayload {
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  timezone: string;
  openingHours: Record<string, { open: string; close: string; isClosed: boolean }>;
}
