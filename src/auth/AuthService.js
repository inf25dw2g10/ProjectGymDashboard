/**
 * AuthService
 * Centraliza toda a lógica de autenticação:
 * - Login via Basic Auth (POST /auth/login)
 * - Logout
 * - Leitura do estado de sessão do localStorage
 */

const KEYS = {
  API_KEY:   'gymApiKey',
  USER_ID:   'gymUserId',
  USER_ROLE: 'gymUserRole',
};

const AuthService = {
  /**
   * Faz login com usernameOrEmail + password.
   * A API devolve: { mensagem, id, role, apiKey }
   */
  async login(usernameOrEmail, password) {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    // Lê o body como texto primeiro para não rebentar se não for JSON
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      // O servidor devolveu HTML (ex: erro 502, backend em baixo)
      throw new Error(`Servidor indisponível (${response.status}). Verifica se o backend está a correr na porta 3000.`);
    }

    if (!response.ok) {
      throw new Error(data.erro || 'Credenciais inválidas.');
    }

    localStorage.setItem(KEYS.API_KEY,   data.apiKey);
    localStorage.setItem(KEYS.USER_ID,   String(data.id));
    localStorage.setItem(KEYS.USER_ROLE, data.role);

    return data;
  },

  logout() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },

  getApiKey() {
    return localStorage.getItem(KEYS.API_KEY);
  },

  getUserRole() {
    return localStorage.getItem(KEYS.USER_ROLE);
  },

  getUserId() {
    return localStorage.getItem(KEYS.USER_ID);
  },

  isLoggedIn() {
    return !!localStorage.getItem(KEYS.API_KEY);
  },
};

export default AuthService;
