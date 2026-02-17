import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// REQUEST INTERCEPTOR
// If no token exists, cancel the request entirely
// This prevents ANY API call when user is not logged in
// ============================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (!token) {
      // No token - cancel the request before it fires
      // Prevents "Failed to load modules" for unauthenticated users
      const controller = new AbortController();
      controller.abort();
      config.signal = controller.signal;
      return config;
    }

    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR
// Handle auth errors globally and silently
// ============================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Request was cancelled (no token) - return empty data, no error thrown
    if (axios.isCancel(error)) {
      console.log('[API] Request cancelled - no token present');
      return Promise.resolve({ data: [] });
    }

    // Auth error - token is invalid or expired
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('[API] Auth error - clearing session');

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('platform_url');

      // Only redirect if not already on root or SSO route
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '/sso') {
        window.location.href = '/';
      }

      // Return empty data instead of throwing error
      return Promise.resolve({ data: [] });
    }

    // All other errors - pass through normally
    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  ssoLogin: async (ssoToken: string) => {
    console.log('🔵 Calling SSO API...');
    console.log('🔗 URL:', `${API_URL}/auth/sso`);
    
    const response = await fetch(`${API_URL}/auth/sso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: ssoToken }),
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SSO Error:', errorText);
      
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || 'SSO authentication failed');
      } catch {
        throw new Error(errorText || 'SSO authentication failed');
      }
    }

    const data = await response.json();
    console.log('✅ SSO Success:', data);
    return data;
  },

  register: async (data: {
    email: string;
    password: string;
    name: string;
    role: 'student' | 'teacher';
    subscription: 'basic' | 'premium';
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// ============================================
// MODULE API
// ============================================
export const moduleAPI = {
  getMyModules: async () => {
    const response = await api.get('/modules/my-modules');
    // Interceptor may return { data: [] } for cancelled/auth requests
    // So response.data is always safe to use
    return response.data;
  },

  getModuleUsers: async (moduleId: string) => {
    const response = await api.get(`/modules/${moduleId}/users`);
    return response.data;
  },
};

// ============================================
// CHAT API
// ============================================
export const chatAPI = {
  getOrCreateRoom: async (targetUserId: string, moduleId: string) => {
    const response = await api.post('/chat/rooms', { targetUserId, moduleId });
    return response.data;
  },

  getUserRooms: async (moduleId: string) => {
    const response = await api.get(`/chat/rooms/${moduleId}`);
    return response.data;
  },

  getRoomMessages: async (roomId: string, limit = 50) => {
    const response = await api.get(`/chat/rooms/${roomId}/messages`, {
      params: { limit },
    });
    return response.data;
  },

  getModuleGroups: async () => {
    const response = await api.get('/chat/module-groups');
    return response.data;
  },
};

export default api;