// ============================================================
// FLUX — inicialização do cliente Supabase (partilhado por todas as páginas)
// Requer que config.js tenha sido carregado antes deste script.
// ============================================================

const flux = window.supabase.createClient(
  window.FLUX_CONFIG.SUPABASE_URL,
  window.FLUX_CONFIG.SUPABASE_ANON_KEY
);

// Garante que há sessão ativa; se não houver, manda para o login.
// Devolve o user_id quando há sessão.
async function fluxRequireSession() {
  const { data: { session } } = await flux.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session.user.id;
}

async function fluxSignOut() {
  await flux.auth.signOut();
  window.location.href = 'login.html';
}
