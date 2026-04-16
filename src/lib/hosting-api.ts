import { api } from './api';

// ==========================================
// HOSTING API — ServerHosting service client
// ==========================================

export interface HosterProvider {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website_url?: string;
  email: string;
  country_code?: string;
  status: 'pending' | 'active' | 'suspended' | 'banned';
  verified_at?: string;
  created_at: string;
}

export interface StorageNodeDb {
  id: string;
  hoster_id: string;
  label: string;
  host: string;
  port: number;
  db_name: string;
  region?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  capacity_gb: number;
  used_gb: number;
  status: 'pending' | 'online' | 'offline' | 'maintenance';
  last_heartbeat?: string;
  max_servers: number;
  current_servers: number;
  db_user?: string;
  created_at: string;
}

export interface StorageNodeMedia {
  id: string;
  hoster_id: string;
  label: string;
  endpoint_url: string;
  region?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  capacity_gb: number;
  used_gb: number;
  status: 'pending' | 'online' | 'offline' | 'maintenance';
  last_heartbeat?: string;
  max_files: number;
  current_files: number;
  created_at: string;
}

export interface HostingOffer {
  id: string;
  hoster_id: string;
  hoster_name?: string;
  hoster_slug?: string;
  hoster_website?: string;
  name: string;
  slug: string;
  description?: string;
  tier: 'free' | 'starter' | 'standard' | 'premium' | 'enterprise';
  price_monthly: number;
  price_yearly: number;
  currency: string;
  limits: {
    members: number;
    channels: number;
    roles: number;
    storage_mb: number;
    uploads_per_day: number;
    file_size_mb: number;
    max_boost_slots?: number;
  };
  features: string[];
  boost_enabled: boolean;
  boost_type: 'admin_only' | 'users' | 'mixed';
}

export interface ApiKey {
  id: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  usage_count: number;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface BoostSummary {
  server_id: string;
  total_boosts: number;
  boost_level: 0 | 1 | 2 | 3;
  unlocked_features: string[];
}

// ── Hébergeur ──────────────────────────────────────────────────────────────

export const hostingApi = {
  registerProvider: (data: {
    name: string;
    email: string;
    slug: string;
    description?: string;
    website_url?: string;
    country_code?: string;
  }) => api.post('/api/hosting/providers/register', data),

  getMe: () => api.get('/api/hosting/providers/me'),

  // Clés API
  createApiKey: (data: { name: string; permissions: string[]; expires_in_days?: number }) =>
    api.post('/api/hosting/apikeys', data),
  listApiKeys: () => api.get('/api/hosting/apikeys'),
  revokeApiKey: (keyId: string) => api.delete(`/api/hosting/apikeys/${keyId}`),

  // Nœuds DB
  addDbNode: (data: Partial<StorageNodeDb> & { db_password: string }) =>
    api.post('/api/hosting/nodes/db', data),
  listDbNodes: () => api.get('/api/hosting/nodes/db'),
  deleteDbNode: (nodeId: string) => api.delete(`/api/hosting/nodes/db/${nodeId}`),

  // Nœuds Media
  addMediaNode: (data: Partial<StorageNodeMedia>) => api.post('/api/hosting/nodes/media', data),
  listMediaNodes: () => api.get('/api/hosting/nodes/media'),
  deleteMediaNode: (nodeId: string) => api.delete(`/api/hosting/nodes/media/${nodeId}`),

  // Offres
  createOffer: (data: Partial<HostingOffer>) => api.post('/api/hosting/offers', data),
  updateOffer: (offerId: string, data: Partial<HostingOffer>) =>
    api.put(`/api/hosting/offers/${offerId}`, data),
  listOffers: (hosterId?: string) =>
    api.get(`/api/hosting/offers${hosterId ? `?hoster_id=${hosterId}` : ''}`),
  deleteOffer: (offerId: string) => api.delete(`/api/hosting/offers/${offerId}`),

  // Configs paiement
  listPaymentConfigs: () => api.get('/api/hosting/payment-configs'),
  setPaymentConfig: (data: { provider: string; secret_key: string; public_key?: string }) =>
    api.post('/api/hosting/payment-configs', data),
  deletePaymentConfig: (provider: string) => api.delete(`/api/hosting/payment-configs/${provider}`),

  // Techniciens
  listTechnicians: () => api.get('/api/hosting/technicians'),
  addTechnician: (username: string, role?: string) =>
    api.post('/api/hosting/technicians', { username, role }),
  removeTechnician: (userId: string) => api.delete(`/api/hosting/technicians/${userId}`),

  // Serveurs heberges
  getHostedServers: (page = 1) => api.get(`/api/hosting/providers/servers?page=${page}`),

  // Boosts
  getBoosts: (serverId: string) => api.get(`/api/hosting/boosts/${serverId}`),
  boostServer: (serverId: string, data: { boost_type: string; boost_slots?: number }) =>
    api.post(`/api/hosting/boosts/${serverId}`, data),

  // Admin
  adminListProviders: (params?: { page?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.status) qs.set('status', params.status);
    return api.get(`/api/hosting/admin/providers?${qs}`);
  },
  adminSetProviderStatus: (id: string, status: string) =>
    api.patch(`/api/hosting/admin/providers/${id}/status`, { status }),
  adminStats: () => api.get('/api/hosting/admin/stats'),
};

// ── Abonnements ────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  target: 'user' | 'server';
  price_monthly: number;
  price_quarterly?: number;
  price_yearly?: number;
  currency: string;
  trial_days: number;
  limits: Record<string, number>;
  features: string[];
}

export interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  features: string[];
  target_type: 'user' | 'server';
  target_id: string;
  provider: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  billing_cycle: string;
  amount: number;
  currency: string;
}

export const subscriptionsApi = {
  listPlans: (target?: 'user' | 'server') =>
    api.get(`/api/subscriptions/plans${target ? `?target=${target}` : ''}`),

  checkout: (provider: 'stripe' | 'mollie' | 'paypal' | 'tebex', data: {
    plan_id: string;
    target_type: 'user' | 'server';
    target_id: string;
    billing_cycle: 'monthly' | 'quarterly' | 'yearly';
    payment_method?: string;
  }) => api.post(`/api/subscriptions/checkout/${provider}`, data),

  getMySubscriptions: () => api.get('/api/subscriptions/me'),
  getServerSubscription: (serverId: string) => api.get(`/api/subscriptions/server/${serverId}`),
  cancelSubscription: (id: string) => api.post(`/api/subscriptions/${id}/cancel`, {}),
  getTransactions: (page = 1) => api.get(`/api/subscriptions/transactions?page=${page}`),
};
