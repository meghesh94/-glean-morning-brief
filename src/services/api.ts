import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Don't redirect if we're already on login
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface BriefItem {
  id: string;
  type: 'item' | 'calendar';
  source: 'slack' | 'github' | 'jira' | 'calendar' | 'mt';
  urgency: 'urgent' | 'attention' | 'followup' | 'fyi' | 'org';
  text: string;
  metadata: Record<string, any>;
  external_id?: string;
  external_url?: string;
  created_at: string;
}

export interface Integration {
  id: string;
  provider: 'slack' | 'github' | 'jira' | 'calendar';
  is_active: boolean;
  created_at: string;
}

export interface Memory {
  id: string;
  layer: 'personal' | 'team' | 'recent';
  key: string;
  value: string;
  source: string;
}

export interface Scratchpad {
  id: string;
  content: string;
  updated_at: string;
}

export const authAPI = {
  register: async (email: string, name: string, password?: string) => {
    const { data } = await api.post('/auth/register', { email, name, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  },
  login: async (email: string, password?: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  },
  getMe: async (): Promise<User> => {
    const { data } = await api.get('/auth/me');
    return data;
  }
};

export const integrationsAPI = {
  getAuthUrl: async (provider: string) => {
    const { data } = await api.get(`/integrations/${provider}/auth`);
    return data;
  },
  list: async (): Promise<Integration[]> => {
    const { data } = await api.get('/integrations');
    return data;
  },
  disconnect: async (provider: string) => {
    await api.delete(`/integrations/${provider}`);
  }
};

export const briefAPI = {
  get: async (limit?: number): Promise<BriefItem[]> => {
    const { data } = await api.get('/brief', { params: { limit } });
    return data;
  },
  generate: async () => {
    const { data } = await api.post('/brief/generate');
    return data;
  },
  delete: async (id: string) => {
    await api.delete(`/brief/${id}`);
  }
};

export const memoryAPI = {
  get: async (): Promise<Memory[]> => {
    const { data } = await api.get('/memory');
    return data;
  },
  update: async (id: string, value: string) => {
    const { data } = await api.put(`/memory/${id}`, { value });
    return data;
  }
};

export const scratchpadAPI = {
  get: async (): Promise<Scratchpad> => {
    const { data } = await api.get('/scratchpad');
    return data;
  },
  update: async (content: string) => {
    const { data } = await api.post('/scratchpad', { content });
    return data;
  }
};

export const conversationAPI = {
  send: async (message: string, briefItemId?: string) => {
    const { data } = await api.post('/conversation', { message, briefItemId });
    return data.response;
  }
};

export default api;

