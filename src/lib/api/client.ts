import { useAuthStore } from '@/lib/stores/authStore';
import axios from 'axios';

const productionBaseURL =
  process.env.EXPO_PUBLIC_API_URL_PROD ||
  'https://meendah.mg-control.com';

const developmentBaseURL = process.env.EXPO_PUBLIC_API_URL_DEV || productionBaseURL;

const baseURL = (__DEV__ ? developmentBaseURL : productionBaseURL).replace(/\/+$/, '');
const apiClient = axios.create({
  baseURL,
  timeout: 60000, // 30 seconds timeout
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
      
      console.log(`🚀 [API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
      if (config.data) console.log('📦 [API Data]', JSON.stringify(config.data, null, 2));
    }

    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('❌ [API Request Error]', error);
    }
    return Promise.reject(error);
  }
);

// Response Logger & Error Handling Interceptor
apiClient.interceptors.response.use(
  (response) => {
    // General Log for Successful Response
    if (__DEV__) {
      console.log(`✅ [API Response Success] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    // General Log for Detailed Error
    if (__DEV__) {
      console.error('🛑 [API Response Error]', {
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
