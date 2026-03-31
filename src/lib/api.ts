const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Résout une URL média relative (/uploads/...) en URL complète
 * Si l'URL est déjà absolue (http/https), la retourne telle quelle
 */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
  if (url.startsWith('/api/servers/')) return `${API_URL}${url}`;
  if (url.startsWith('/api/media/')) return `${API_URL}${url}`;
  return url;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.baseUrl = API_URL;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('alfychat_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('alfychat_refresh_token');
  }

  /**
   * Tente de rafraîchir le token d'accès avec le refresh token.
   * Retourne true si le refresh a réussi, false sinon.
   */
  async tryRefreshToken(): Promise<boolean> {
    // Éviter les appels concurrents de refresh
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshTokenValue = this.getRefreshToken();
    if (!refreshTokenValue) {
      console.log('🔄 Pas de refresh token disponible');
      return false;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        console.log('🔄 Tentative de refresh du token...');
        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenValue }),
        });

        if (!response.ok) {
          console.log('❌ Refresh token échoué (HTTP', response.status, ')');
          return false;
        }

        const data = await response.json();
        const newAccessToken = data.accessToken || data.tokens?.accessToken;
        const newRefreshToken = data.refreshToken || data.tokens?.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('alfychat_token', newAccessToken);
          console.log('✅ Token rafraîchi avec succès');
        }
        if (newRefreshToken) {
          localStorage.setItem('alfychat_refresh_token', newRefreshToken);
        }

        return !!newAccessToken;
      } catch (error) {
        console.error('❌ Erreur lors du refresh token:', error);
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    _skipRefresh = false
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      // Si 401 et pas déjà en refresh → tenter le refresh et réessayer
      if (response.status === 401 && !_skipRefresh && !endpoint.includes('/api/auth/')) {
        console.log('🔄 Réponse 401 sur', endpoint, '→ tentative de refresh token');
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Réessayer la requête avec le nouveau token
          return this.request<T>(endpoint, options, true);
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Une erreur est survenue',
          data: data as T,
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
      };
    }
  }

  // ============ AUTHENTIFICATION ============
  async register(data: { email: string; username: string; password: string; displayName?: string; inviteCode?: string; turnstileToken?: string; publicKey?: string; encryptedPrivateKey?: string; keySalt?: string }) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string; turnstileToken?: string }) {
    return this.request<{ accessToken: string; refreshToken: string; user: unknown }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string) {
    return this.request<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  // ============ UTILISATEURS ============
  async getMe() {
    return this.request('/api/users/me');
  }

  async getUserPublicKey(userId: string) {
    return this.request<{ publicKey: string }>(`/api/users/${userId}/public-key`);
  }

  async saveMyKeys(data: { publicKey: string; encryptedPrivateKey: string; keySalt: string }) {
    return this.request('/api/auth/keys', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async resendVerificationEmailByAddress(email: string) {
    return this.request('/api/auth/resend-verification-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async updateProfile(data: { displayName?: string; bio?: string; avatarUrl?: string; bannerUrl?: string; cardColor?: string; showBadges?: boolean }) {
    return this.request('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ============ MÉDIA (upload d'images) ============
  async uploadImage(file: File, type: 'avatar' | 'banner' | 'attachment' | 'icon'): Promise<ApiResponse<{ url: string; width: number; height: number; size: number }>> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${this.baseUrl}/api/media/upload/${type}`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Erreur upload' };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
      };
    }
  }

  async deleteImage(url: string): Promise<ApiResponse<void>> {
    return this.request('/api/media/delete', {
      method: 'DELETE',
      body: JSON.stringify({ url }),
    });
  }

  async markNotificationsRead(conversationId: string): Promise<void> {
    await this.request('/api/notifications/read', {
      method: 'PATCH',
      body: JSON.stringify({ conversationId }),
    }).catch(() => {});
  }

  // Upload de fichier sur un server-node (attachments de serveur)
  async uploadServerFile(serverId: string, file: File, channelId?: string): Promise<ApiResponse<{ id: string; url: string; originalName: string; mimeType: string; size: number }>> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    try {
      let url = `${this.baseUrl}/api/servers/${serverId}/files`;
      const params: string[] = [];
      if (channelId) params.push(`channelId=${channelId}`);
      if (params.length) url += `?${params.join('&')}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Erreur upload' };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
      };
    }
  }

  async getPreferences(userId: string) {
    return this.request(`/api/users/${userId}/preferences`);
  }

  async updatePreferences(userId: string, preferences: Record<string, unknown>) {
    return this.request(`/api/users/${userId}/preferences`, {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    });
  }

  async logoutAll() {
    return this.request('/api/auth/logout-all', { method: 'POST' });
  }

  async getUser(userId: string) {
    return this.request(`/api/users/${userId}`);
  }

  async searchUsers(query: string) {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
  }

  async changePassword(userId: string, data: { currentPassword: string; newPassword: string }) {
    return this.request(`/api/users/${userId}/change-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============ RGPD ============
  async exportMyData() {
    return this.request('/api/rgpd/export', { method: 'POST' });
  }

  async requestAccountDeletion(password: string) {
    return this.request('/api/rgpd/delete', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async getConsents() {
    return this.request('/api/rgpd/consents');
  }

  async updateConsent(type: string, granted: boolean) {
    return this.request('/api/rgpd/consents', {
      method: 'PUT',
      body: JSON.stringify({ type, granted }),
    });
  }

  // ============ MESSAGES ============
  async getConversations() {
    return this.request('/api/conversations');
  }

  async getConversation(conversationId: string) {
    return this.request(`/api/conversations/${conversationId}`);
  }

  async createOrGetDM(recipientId: string) {
    return this.request('/api/conversations/dm', {
      method: 'POST',
      body: JSON.stringify({ recipientId }),
    });
  }

  async createGroupConversation(data: { name: string; participantIds: string[]; avatarUrl?: string }) {
    return this.request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ type: 'group', ...data }),
    });
  }

  async updateConversation(conversationId: string, data: { name?: string; avatarUrl?: string }) {
    return this.request(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async leaveGroup(conversationId: string) {
    return this.request(`/api/conversations/${conversationId}/leave`, {
      method: 'POST',
    });
  }

  async addGroupParticipant(conversationId: string, userId: string) {
    return this.request(`/api/conversations/${conversationId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async removeGroupParticipant(conversationId: string, userId: string) {
    return this.request(`/api/conversations/${conversationId}/participants/${userId}`, {
      method: 'DELETE',
    });
  }

  async deleteGroup(conversationId: string) {
    return this.request(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async getMessages(channelId?: string, recipientId?: string, limit = 50, before?: string) {
    const params = new URLSearchParams();
    if (channelId) params.append('channelId', channelId);
    if (recipientId) params.append('recipientId', recipientId);
    params.append('limit', limit.toString());
    if (before) params.append('before', before);
    
    return this.request(`/api/messages?${params.toString()}`);
  }

  async sendMessage(data: {
    channelId?: string;
    recipientId?: string;
    content: string;
    attachments?: string[];
  }) {
    return this.request('/api/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============ AMIS ============
  async getFriends() {
    return this.request('/api/friends');
  }

  // ============ ARCHIVAGE DM (Système Hybride) ============
  async getArchiveStatus(conversationId: string) {
    return this.request(`/api/archive/status/${conversationId}`);
  }

  async getArchiveStats(conversationId: string) {
    return this.request(`/api/archive/stats/${conversationId}`);
  }

  async checkArchiveQuota(conversationId: string) {
    return this.request(`/api/archive/quota/${conversationId}`);
  }

  async confirmArchive(conversationId: string, archiveLogId: string) {
    return this.request('/api/archive/confirm', {
      method: 'POST',
      body: JSON.stringify({ conversationId, archiveLogId }),
    });
  }

  async getCachedArchivedMessage(messageId: string) {
    return this.request(`/api/archive/message/${messageId}`);
  }

  async getFriendRequests() {
    return this.request('/api/friends/requests');
  }

  async sendFriendRequest(userId: string) {
    return this.request('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async acceptFriendRequest(requestId: string) {
    return this.request(`/api/friends/requests/${requestId}/accept`, { method: 'POST' });
  }

  async declineFriendRequest(requestId: string) {
    return this.request(`/api/friends/requests/${requestId}/decline`, { method: 'POST' });
  }

  async removeFriend(userId: string) {
    return this.request(`/api/friends/${userId}`, { method: 'DELETE' });
  }

  async blockUser(userId: string) {
    return this.request(`/api/friends/${userId}/block`, { method: 'POST' });
  }

  async unblockUser(userId: string) {
    return this.request(`/api/friends/${userId}/unblock`, { method: 'POST' });
  }

  async getBlockedUsers() {
    return this.request('/api/friends/blocked');
  }

  // ============ SERVEURS ============
  async getServers() {
    return this.request('/api/servers');
  }

  async getServer(serverId: string) {
    return this.request(`/api/servers/${serverId}`);
  }

  async joinServer(inviteCode: string) {
    return this.request('/api/servers/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  }

  async leaveServer(serverId: string) {
    return this.request(`/api/servers/${serverId}/leave`, { method: 'POST' });
  }

  async getServerChannels(serverId: string) {
    return this.request(`/api/servers/${serverId}/channels`);
  }

  async createChannel(serverId: string, data: { name: string; type: 'text' | 'voice' }) {
    return this.request(`/api/servers/${serverId}/channels`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChannel(serverId: string, channelId: string, data: { name?: string; topic?: string; position?: number; isNsfw?: boolean }) {
    return this.request(`/api/servers/${serverId}/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteChannel(serverId: string, channelId: string) {
    return this.request(`/api/servers/${serverId}/channels/${channelId}`, {
      method: 'DELETE',
    });
  }

  async updateServer(serverId: string, data: { name?: string; description?: string; iconUrl?: string; bannerUrl?: string; isPublic?: boolean }) {
    return this.request(`/api/servers/${serverId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteServer(serverId: string) {
    return this.request(`/api/servers/${serverId}`, {
      method: 'DELETE',
    });
  }

  async getServerMembers(serverId: string) {
    return this.request(`/api/servers/${serverId}/members`);
  }

  async getServerRoles(serverId: string) {
    return this.request(`/api/servers/${serverId}/roles`);
  }

  async createRole(serverId: string, data: { name: string; color?: string; permissions?: string[] }) {
    return this.request(`/api/servers/${serverId}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRole(serverId: string, roleId: string, data: { name?: string; color?: string; permissions?: string[]; iconEmoji?: string; iconUrl?: string }) {
    return this.request(`/api/servers/${serverId}/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteRole(serverId: string, roleId: string) {
    return this.request(`/api/servers/${serverId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  // ============ INVITATIONS SERVEUR ============
  async createServerInvite(serverId: string, data: { maxUses?: number; expiresIn?: number; customSlug?: string; isPermanent?: boolean }) {
    return this.request(`/api/servers/${serverId}/invites`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getServerInvites(serverId: string) {
    return this.request(`/api/servers/${serverId}/invites`);
  }

  async deleteServerInvite(inviteId: string) {
    return this.request(`/api/servers/invites/${inviteId}`, {
      method: 'DELETE',
    });
  }

  async resolveInvite(code: string) {
    return this.request(`/api/servers/invite/${encodeURIComponent(code)}`);
  }

  // ============ MESSAGES SERVEUR ============
  async getChannelMessages(serverId: string, channelId: string, limit = 50, before?: string) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (before) params.append('before', before);
    return this.request(`/api/servers/${serverId}/channels/${channelId}/messages?${params.toString()}`);
  }

  // ============ NODE TOKEN ============
  async getNodeToken(serverId: string) {
    return this.request(`/api/servers/${serverId}/node-token`);
  }

  async claimAdmin(serverId: string, code: string, userId: string) {
    return this.request(`/api/servers/${serverId}/claim-admin`, {
      method: 'POST',
      body: JSON.stringify({ code, userId }),
    });
  }

  // ============ DOMAINE PERSONNALISÉ ============
  async startDomainVerification(serverId: string, domain: string) {
    return this.request(`/api/servers/${serverId}/domain/start`, {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
  }

  async checkDomainVerification(serverId: string) {
    return this.request(`/api/servers/${serverId}/domain/check`, {
      method: 'POST',
    });
  }

  // ============ SERVEURS PUBLICS ============
  async getPublicServers(search?: string, limit = 20, offset = 0) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return this.request(`/api/servers/public/list?${params.toString()}`);
  }

  // ============ APPELS ============
  async initiateCall(data: { recipientId?: string; channelId?: string; type: 'voice' | 'video' }) {
    return this.request('/api/calls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActiveCall(callId: string) {
    return this.request(`/api/calls/${callId}`);
  }

  async endCall(callId: string) {
    return this.request(`/api/calls/${callId}/end`, { method: 'POST' });
  }

  // ============ BOTS ============
  async getMyBots() {
    return this.request('/api/bots/me');
  }

  async getPublicBots(search?: string, tag?: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tag) params.set('tag', tag);
    const qs = params.toString();
    return this.request(`/api/bots/public${qs ? `?${qs}` : ''}`);
  }

  async getBotById(botId: string) {
    return this.request(`/api/bots/${botId}`);
  }

  async createBot(data: { name: string; description?: string; prefix?: string }) {
    return this.request('/api/bots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBot(botId: string, data: {
    name?: string; description?: string; prefix?: string;
    isPublic?: boolean; tags?: string[];
    websiteUrl?: string; supportServerUrl?: string; privacyPolicyUrl?: string;
    avatarUrl?: string;
  }) {
    return this.request(`/api/bots/${botId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBot(botId: string) {
    return this.request(`/api/bots/${botId}`, { method: 'DELETE' });
  }

  async regenerateBotToken(botId: string) {
    return this.request(`/api/bots/${botId}/regenerate-token`, { method: 'POST' });
  }

  async updateBotStatus(botId: string, status: string) {
    return this.request(`/api/bots/${botId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Bot commands
  async getBotCommands(botId: string) {
    return this.request(`/api/bots/${botId}/commands`);
  }

  async createBotCommand(botId: string, data: { name: string; description: string; usage?: string; cooldown?: number; permissions?: number }) {
    return this.request(`/api/bots/${botId}/commands`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBotCommand(botId: string, commandId: string, data: Record<string, unknown>) {
    return this.request(`/api/bots/${botId}/commands/${commandId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBotCommand(botId: string, commandId: string) {
    return this.request(`/api/bots/${botId}/commands/${commandId}`, { method: 'DELETE' });
  }

  // Bot servers
  async addBotToServer(botId: string, serverId: string, permissions?: number) {
    return this.request(`/api/bots/${botId}/servers`, {
      method: 'POST',
      body: JSON.stringify({ serverId, permissions: permissions || 0 }),
    });
  }

  async removeBotFromServer(botId: string, serverId: string) {
    return this.request(`/api/bots/${botId}/servers/${serverId}`, { method: 'DELETE' });
  }

  async getBotsInServer(serverId: string) {
    return this.request(`/api/bots/servers/${serverId}`);
  }

  // Bot certification
  async requestBotCertification(botId: string, reason: string) {
    return this.request(`/api/bots/${botId}/certification`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getPendingCertifications() {
    return this.request('/api/bots/certification/pending');
  }

  async reviewBotCertification(requestId: string, status: 'approved' | 'rejected', note?: string) {
    return this.request(`/api/bots/certification/${requestId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    });
  }

  // ============ ADMIN ============
  
  // Stats
  async getAdminStats() {
    return this.request('/api/admin/stats');
  }

  // Badges personnalisés
  async getAdminBadges() {
    return this.request('/api/admin/badges');
  }

  async createBadge(data: {
    name: string;
    description?: string;
    iconType: 'bootstrap' | 'svg';
    iconValue: string;
    color: string;
    displayOrder?: number;
  }) {
    return this.request('/api/admin/badges', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBadge(badgeId: string, data: Partial<{
    name: string;
    description: string;
    iconType: 'bootstrap' | 'svg';
    iconValue: string;
    color: string;
    displayOrder: number;
  }>) {
    return this.request(`/api/admin/badges/${badgeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async toggleBadgeStatus(badgeId: string, isActive: boolean) {
    return this.request(`/api/admin/badges/${badgeId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async deleteBadge(badgeId: string) {
    return this.request(`/api/admin/badges/${badgeId}`, {
      method: 'DELETE',
    });
  }

  // Gestion des utilisateurs
  async getAdminUsers(limit: number = 100, offset: number = 0) {
    return this.request(`/api/admin/users?limit=${limit}&offset=${offset}`);
  }

  async searchAdminUsers(query: string) {
    return this.request(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
  }

  async updateUserRole(userId: string, role: 'user' | 'moderator' | 'admin') {
    return this.request(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  // Attribution de badges aux utilisateurs
  async assignBadgeToUser(userId: string, badgeId: string) {
    return this.request(`/api/admin/users/${userId}/badges/${badgeId}`, {
      method: 'POST',
    });
  }

  async removeBadgeFromUser(userId: string, badgeId: string) {
    return this.request(`/api/admin/users/${userId}/badges/${badgeId}`, {
      method: 'DELETE',
    });
  }

  // Paramètres du site
  async getAdminSettings() {
    return this.request('/api/admin/settings');
  }

  async updateAdminSetting(key: string, value: string) {
    return this.request('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    });
  }

  // Liens d'inscription
  async createInviteLink(email: string, expiresInHours?: number) {
    return this.request('/api/admin/invite-links', {
      method: 'POST',
      body: JSON.stringify({ email, expiresInHours }),
    });
  }

  async getInviteLinks() {
    return this.request('/api/admin/invite-links');
  }

  async deleteInviteLink(linkId: string) {
    return this.request(`/api/admin/invite-links/${linkId}`, {
      method: 'DELETE',
    });
  }

  // ============ GATEWAY ADMIN (Rate Limit & IP Bans) ============

  async getGatewayStats() {
    return this.request<{
      bannedIPs: Array<{ ip: string; reason: string; bannedBy: string; bannedAt: string }>;
      rateLimitStats: { totalBlocked: number; activeWindows: number };
      config: { window: number; max: number };
    }>('/api/admin/gateway/stats');
  }

  async banIP(ip: string, reason?: string) {
    return this.request('/api/admin/gateway/ban-ip', {
      method: 'POST',
      body: JSON.stringify({ ip, reason }),
    });
  }

  async unbanIP(ip: string) {
    return this.request(`/api/admin/gateway/ban-ip/${encodeURIComponent(ip)}`, {
      method: 'DELETE',
    });
  }

  // ============ SERVICE REGISTRY ============

  async getAdminServices() {
    return this.request<{ instances: any[] }>('/api/admin/services');
  }

  async getAdminServicesByType(type: string) {
    return this.request<{ instances: any[] }>(`/api/admin/services/${encodeURIComponent(type)}`);
  }

  async addAdminService(data: {
    id: string;
    serviceType: string;
    endpoint: string;
    domain: string;
    location: string;
  }) {
    return this.request('/api/admin/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminService(id: string) {
    return this.request(`/api/admin/services/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // ============ CHANGELOGS ============

  async getMonitoringStats() {
    return this.request<any>('/api/admin/monitoring');
  }

  async getMonitoringServiceHistory(service: string, hours = 24) {
    return this.request<any>(`/api/admin/monitoring/service/${service}?hours=${hours}`);
  }

  async getMonitoringUsersChart(period: '30min' | '10min' | 'hour' | 'day' | 'month') {
    return this.request<any>(`/api/admin/monitoring/users/chart?period=${period}`);
  }

  // ============ STATUS / INCIDENTS ============

  async getPublicStatus() {
    return this.request<any>('/api/status');
  }

  async getAdminIncidents(includeResolved = false) {
    return this.request<any>(`/api/admin/status/incidents?includeResolved=${includeResolved}`);
  }

  async createIncident(data: {
    title: string;
    message?: string;
    severity: 'info' | 'warning' | 'critical';
    services?: string[];
    status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  }) {
    return this.request<{ id: number }>('/api/admin/status/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIncident(id: number, data: {
    title?: string;
    message?: string;
    severity?: 'info' | 'warning' | 'critical';
    services?: string[];
    status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  }) {
    return this.request<{ success: boolean }>(`/api/admin/status/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteIncident(id: number) {
    return this.request<{ success: boolean }>(`/api/admin/status/incidents/${id}`, {
      method: 'DELETE',
    });
  }

  async getChangelogs(limit = 50, offset = 0) {
    return this.request<any[]>(`/api/users/changelogs?limit=${limit}&offset=${offset}`);
  }

  async createChangelog(data: {
    version: string;
    title: string;
    content: string;
    type: 'feature' | 'fix' | 'improvement' | 'security' | 'breaking';
    bannerUrl?: string;
  }) {
    return this.request('/api/admin/changelogs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteChangelog(changelogId: string) {
    return this.request(`/api/admin/changelogs/${changelogId}`, {
      method: 'DELETE',
    });
  }

  // Paramètres d'inscription publics (pas d'auth)
  async getRegisterSettings() {
    return this.request('/api/auth/register/settings');
  }

  // ============ VÉRIFICATION EMAIL ============
  async verifyEmail(token: string) {
    return this.request(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  }

  async resendVerificationEmail() {
    return this.request('/api/auth/resend-verification', { method: 'POST' });
  }

  // ============ 2FA (TOTP) ============
  async get2FAStatus() {
    return this.request<{ enabled: boolean }>('/api/auth/2fa/status');
  }

  async setup2FA() {
    return this.request<{ secret: string; qrCodeDataUrl: string; otpauthUrl: string }>('/api/auth/2fa/setup', { method: 'POST' });
  }

  async enable2FA(code: string) {
    return this.request<{ backupCodes: string[] }>('/api/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async disable2FA(code: string) {
    return this.request('/api/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async loginWith2FA(twoFactorToken: string, code: string) {
    return this.request<{ user: unknown; tokens: { accessToken: string; refreshToken: string; expiresIn: number; sessionId: string } }>('/api/auth/2fa/login', {
      method: 'POST',
      body: JSON.stringify({ twoFactorToken, code }),
    });
  }

  // ============ SESSIONS ACTIVES ============
  async getSessions() {
    return this.request<{ sessions: { id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; expiresAt: string }[] }>('/api/auth/sessions');
  }

  async revokeSession(sessionId: string) {
    return this.request(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
  }

  // ============ DÉCOUVERTE SERVEURS & BADGES ============

  async getDiscoverServers() {
    return this.request('/api/servers/discover/list');
  }

  async applyForDiscovery(serverId: string, reason: string) {
    return this.request('/api/servers/discover/apply', {
      method: 'POST',
      body: JSON.stringify({ serverId, reason }),
    });
  }

  async getDiscoverApplications(status: string = 'pending') {
    return this.request(`/api/servers/discover/applications?status=${status}`);
  }

  async reviewApplication(applicationId: string, action: 'approved' | 'rejected') {
    return this.request(`/api/servers/discover/review/${applicationId}`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  async getServerBadges(serverId: string) {
    return this.request(`/api/servers/badges/${serverId}`);
  }

  async updateServerBadges(serverId: string, data: { isCertified?: boolean; isPartnered?: boolean }) {
    return this.request(`/api/servers/badges/${serverId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getAllServersAdmin() {
    return this.request('/api/servers/admin/all');
  }

  async featureServer(serverId: string) {
    return this.request(`/api/servers/admin/feature/${serverId}`, { method: 'POST' });
  }

  async unfeatureServer(serverId: string) {
    return this.request(`/api/servers/admin/feature/${serverId}`, { method: 'DELETE' });
  }

  // ============ SIGNAL E2EE — DISTRIBUTION DE CLÉS ============

  /**
   * Publie le bundle de clés Signal de l'utilisateur courant sur le serveur.
   * Seules les clés PUBLIQUES sont envoyées. Les privées restent dans IndexedDB.
   */
  async publishSignalKeyBundle(bundle: {
    registrationId: number;
    identityKey: string;
    ecdhKey?: string;
    signedPrekey: { keyId: number; publicKey: string; signature: string };
    prekeys: Array<{ keyId: number; publicKey: string }>;
  }) {
    return this.request('/api/users/keys', {
      method: 'PUT',
      body: JSON.stringify(bundle),
    });
  }

  /**
   * Récupère le bundle de clés publiques d'un autre utilisateur.
   * Consomme une one-time prekey côté serveur.
   */
  async getSignalKeyBundle(userId: string) {
    return this.request(`/api/users/keys/${userId}`);
  }

  /**
   * Vérifie le statut des clés Signal de l'utilisateur courant.
   */
  async getSignalKeyStatus(): Promise<{ hasBundle: boolean; prekeyCount: number } | null> {
    const res = await this.request<{ hasBundle: boolean; prekeyCount: number }>('/api/users/keys/status');
    return res.success && res.data ? (res.data as { hasBundle: boolean; prekeyCount: number }) : null;
  }

  /**
   * Recharge des one-time prekeys (appelé quand le stock est bas).
   */
  async replenishSignalPrekeys(prekeys: Array<{ keyId: number; publicKey: string }>) {
    return this.request('/api/users/keys/prekeys', {
      method: 'POST',
      body: JSON.stringify({ prekeys }),
    });
  }

  /**
   * Met à jour uniquement la clé ECDH P-256 du bundle public existant.
   */
  async updateSignalECDHKey(ecdhKey: string) {
    return this.request('/api/users/keys/ecdh', {
      method: 'PATCH',
      body: JSON.stringify({ ecdhKey }),
    });
  }

  /**
   * Stocke le bundle de clés privées chiffré sur le serveur.
   * Le blob est opaque pour le serveur (chiffré PBKDF2+AES-256-GCM côté client).
   */
  async uploadPrivateBundle(encryptedBundle: string) {
    return this.request('/api/users/keys/private-bundle', {
      method: 'PUT',
      body: JSON.stringify({ encryptedBundle }),
    });
  }

  /**
   * Récupère le bundle de clés privées chiffré depuis le serveur.
   * Retourne null si aucun backup n'existe encore.
   */
  async downloadPrivateBundle(): Promise<{ encryptedBundle: string | null } | null> {
    const res = await this.request<{ encryptedBundle: string | null }>('/api/users/keys/private-bundle');
    return res.success ? (res.data as { encryptedBundle: string | null }) : null;
  }
}

export const api = new ApiService();
export default api;
