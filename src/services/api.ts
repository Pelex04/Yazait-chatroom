import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'https://chatroom-h46w.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// REQUEST INTERCEPTOR
// Simply attach token if it exists.
// No cancellation — let the server respond naturally.
// ============================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Only clear session if we actually had a token (expired/invalid)
      // If there was no token, we don't need to do anything
      const hadToken = !!localStorage.getItem('token');

      if (hadToken) {
        console.log('[API] Token expired or invalid - clearing session');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('platform_url');
        localStorage.removeItem('selectedModule');

        const currentPath = window.location.pathname;
        if (currentPath !== '/' && currentPath !== '/sso') {
          window.location.href = '/';
        }
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  ssoLogin: async (ssoToken: string) => {
    const response = await fetch(`${API_URL}/auth/sso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: ssoToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || 'SSO authentication failed');
      } catch {
        throw new Error(errorText || 'SSO authentication failed');
      }
    }

    return response.json();
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