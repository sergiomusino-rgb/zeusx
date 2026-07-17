/**
 * ZeusX - Database Types
 * Tipi TypeScript per le tabelle Supabase
 */

// App Status enum
export type AppStatus = 'trial' | 'active' | 'expired';

// Tabella apps - con i nuovi campi per Stripe Managed Payments
export interface App {
  id: string; // UUID
  tenant_id: string; // UUID
  blueprint_id: string | null; // UUID
  name: string;
  config: Record<string, unknown>;
  trial_ends_at: string | null; // TIMESTAMPTZ
  is_active: boolean;
  created_at: string | null; // TIMESTAMPTZ
  updated_at: string | null; // TIMESTAMPTZ
  
  // Nuovi campi per Milestone 1 - Stripe Managed Payments
  stripe_connect_id: string | null; // ID account Stripe Connect del proprietario
  client_subscription_price: number; // Prezzo abbonamento clienti (default 0.00)
  totalum_app_id: string | null; // ID app generata da Totalum
  status: AppStatus; // Stato: trial, active, expired (default 'trial')
}

// Tabella tenants
export interface Tenant {
  id: string; // UUID
  owner_id: string; // UUID
  name: string;
  slug: string;
  plan: string;
  app_limit: number;
  created_at: string | null; // TIMESTAMPTZ
  updated_at: string | null; // TIMESTAMPTZ
}

// Tabella profiles
export interface Profile {
  id: string; // UUID
  user_id: string; // UUID
  email: string | null;
  full_name: string | null;
  created_at: string | null; // TIMESTAMPTZ
  updated_at: string | null; // TIMESTAMPTZ
}

// Tabella subscriptions
export interface Subscription {
  id: string; // UUID
  tenant_id: string; // UUID
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_start: string | null; // TIMESTAMPTZ
  current_period_end: string | null; // TIMESTAMPTZ
  created_at: string | null; // TIMESTAMPTZ
  updated_at: string | null; // TIMESTAMPTZ
}

// Tabella app_registry (per Management Console)
export interface AppRegistry {
  id: string; // UUID
  reseller_id: string; // UUID
  app_name: string;
  app_url: string;
  status: string;
  monthly_fee: number;
  zeusx_share: number;
  created_at: string | null; // TIMESTAMPTZ
  updated_at: string | null; // TIMESTAMPTZ
}

// Input types per le operazioni di inserimento
export interface NewApp {
  tenant_id: string;
  blueprint_id?: string | null;
  name: string;
  config?: Record<string, unknown>;
  stripe_connect_id?: string | null;
  client_subscription_price?: number;
  totalum_app_id?: string | null;
  status?: AppStatus;
}

// Input types per le operazioni di update
export interface UpdateApp {
  name?: string;
  config?: Record<string, unknown>;
  is_active?: boolean;
  stripe_connect_id?: string | null;
  client_subscription_price?: number;
  totalum_app_id?: string | null;
  status?: AppStatus;
}