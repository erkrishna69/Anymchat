const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('anym_auth_token');
  }
  return null;
}

export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('anym_auth_token', token);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const ApiService = {
  // Auth
  createAnonymousUser: async (params?: {
    alias?: string;
    avatarId?: number;
    gender?: 'male' | 'female' | 'other';
  }) => {
    return request<{ success: boolean; user: any; token: string }>('/auth/anonymous', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  },

  generateAiName: async (seed?: string, avatarId?: number, gender?: string) => {
    const params = new URLSearchParams();
    if (seed) params.set('seed', seed);
    if (avatarId) params.set('avatarId', avatarId.toString());
    if (gender) params.set('gender', gender);
    return request<{ success: boolean; alias: string }>(`/auth/generate-name?${params.toString()}`);
  },

  signup: async (
    email: string,
    password: string,
    avatarId?: number,
    alias?: string,
    gender?: 'male' | 'female' | 'other',
    referredBy?: string
  ) => {
    return request<{ success: boolean; user: any; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, avatarId, alias, gender, referredBy }),
    });
  },

  login: async (email: string, password: string) => {
    return request<{ success: boolean; user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getProfile: async () => {
    return request<{ success: boolean; user: any }>('/auth/profile');
  },

  updateAlias: async (alias?: string) => {
    return request<{ success: boolean; user: any }>('/auth/alias', {
      method: 'PUT',
      body: JSON.stringify({ alias }),
    });
  },

  deleteAccount: async () => {
    return request<{ success: boolean; message: string }>('/auth/account', {
      method: 'DELETE',
    });
  },

  // Location
  updateLocation: async (latitude: number, longitude: number, radiusKm: number = 10) => {
    return request<{ success: boolean; data: any }>('/location/update', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, radiusKm }),
    });
  },

  // Feed
  getNearbyFeed: async (latitude: number, longitude: number, radiusKm: number = 10) => {
    return request<{ success: boolean; data: { radiusKm: number; messages: any[] } }>(
      `/feed?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`
    );
  },

  postFeedMessage: async (content: string, latitude: number, longitude: number) => {
    return request<{ success: boolean; message: any }>('/feed', {
      method: 'POST',
      body: JSON.stringify({ content, latitude, longitude }),
    });
  },

  // Direct Messages
  getChatHistory: async (otherUserId: string) => {
    return request<{ success: boolean; data: any[] }>(`/direct/${otherUserId}`);
  },

  sendDirectMessage: async (recipientAnonymousId: string, content: string) => {
    return request<{ success: boolean; message: any }>('/direct', {
      method: 'POST',
      body: JSON.stringify({ recipientAnonymousId, content }),
    });
  },

  // Nearby Presence
  getNearbyUsers: async (latitude: number, longitude: number, radiusKm: number = 10) => {
    return request<{ success: boolean; data: { radiusKm: number; totalNearby: number; users: any[] } }>(
      `/presence/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`
    );
  },

  // Safety
  reportUser: async (reportedAnonymousId: string, reason: string, details?: string, messageId?: string) => {
    return request<{ success: boolean; message: string }>('/safety/report', {
      method: 'POST',
      body: JSON.stringify({ reportedAnonymousId, reason, additionalDetails: details, messageId }),
    });
  },

  blockUser: async (targetAnonymousId: string) => {
    return request<{ success: boolean; message: string }>('/safety/block', {
      method: 'POST',
      body: JSON.stringify({ targetAnonymousId }),
    });
  },

  getBlockedUsers: async () => {
    return request<{ success: boolean; data: string[] }>('/safety/blocked');
  },

  // Referrals
  getMyReferral: async () => {
    return request<{ success: boolean; referralCode: string; inviteUrl: string; totalReferrals: number }>('/referrals/me');
  },

  validateReferralCode: async (code: string) => {
    return request<{ success: boolean; referralCode: string }>(`/referrals/${code}`);
  },

  recordReferralOpen: async (code: string) => {
    return request<{ success: boolean }>(`/referrals/${code}/open`, { method: 'POST' });
  },
};
