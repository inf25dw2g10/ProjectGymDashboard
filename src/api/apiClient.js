import axios from 'axios';
import AuthService from '../auth/AuthService';

/**
 * Cliente Axios configurado para a GymAPI.
 *
 * Interceptor de REQUEST:
 *   Injeta automaticamente o header X-API-Key em todos os pedidos.
 *
 * Interceptor de RESPONSE:
 *   Se a API devolver 401, faz logout e redireciona para /login.
 *   Isto trata o caso de a API Key ficar inválida ou expirada.
 */
const apiClient = axios.create({
  // Em dev: setupProxy.js reencaminha para a API; em prod: nginx faz o proxy
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Interceptor de REQUEST ---
apiClient.interceptors.request.use(
  (config) => {
    const apiKey = AuthService.getApiKey();
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Interceptor de RESPONSE ---
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      AuthService.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
