import { useAuthStore } from '@/lib/stores/authStore';
import axios from 'axios';

const baseURL = (process.env.EXPO_PUBLIC_API_URL || 'https://meendah.mg-control.com').replace(/\/+$/, '');
const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Logger Interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // General Log for Outgoing Request
    if (__DEV__) {
      const fullUrl = config.url?.startsWith('http') 
        ? config.url 
        : `${config.baseURL || ''}${config.url || ''}`.replace(/([^:]\/)\/+/g, "$1");
      
      console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
      if (config.data) console.log('[API Data]', config.data);
    }

    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('[API Request Error]', error);
    }
    return Promise.reject(error);
  }
);

// Response Logger & Error Handling Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // General Log for Successful Response
    if (__DEV__) {
      console.log(`[API Response Success] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    // General Log for Detailed Error
    if (__DEV__) {
      console.error('[API Response Error]', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
    }

    const originalRequest = error.config;
    const { refreshToken, setTokens, logout } = useAuthStore.getState();

    // Handle Token Refresh
    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;
      try {
        if (__DEV__) console.log('[API] Attempting to refresh token...');
        const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
          refreshToken,
        });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        setTokens(newAccessToken, newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        
        if (__DEV__) console.log('[API] Token refreshed successfully, retrying request...');
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (__DEV__) console.error('[API] Token refresh failed:', refreshError);
        logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
