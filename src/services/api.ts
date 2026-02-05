import axios from 'axios';

const API_URL = 'https://chatroom-h46w.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
      
      // Try to parse as JSON, fallback to text
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