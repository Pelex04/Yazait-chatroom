import axios from 'axios';

const API_URL = 'https://chatroom-0u60.onrender.com/api';

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