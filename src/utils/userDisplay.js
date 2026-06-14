/**
 * Helpers para apresentar nomes de utilizadores.
 */

export function nomeUtilizador(user, fallbackId = null) {
  if (!user) {
    if (fallbackId != null) return `#${fallbackId}`;
    return '-';
  }
  if (typeof user === 'object') {
    return user.displayName || user.username || (user.id != null ? `#${user.id}` : '-');
  }
  return String(user);
}

export function encontrarUtilizador(lista, id) {
  if (id == null || !lista) return null;
  return lista.find((u) => u.id === id || String(u.id) === String(id)) || null;
}
