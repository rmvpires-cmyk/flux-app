// ============================================================
// FLUX — inicialização do cliente Supabase (partilhado por todas as páginas)
// Requer que config.js tenha sido carregado antes deste script.
// ============================================================

const flux = window.supabase.createClient(
  window.FLUX_CONFIG.SUPABASE_URL,
  window.FLUX_CONFIG.SUPABASE_ANON_KEY
);

// Garante que há sessão ativa; se não houver, manda para o login.
// Se este aparelho tiver o cadeado por biometria ativado para este utilizador,
// bloqueia o ecrã até confirmar a biometria antes de devolver o user_id.
async function fluxRequireSession() {
  const { data: { session } } = await flux.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  const credId = localStorage.getItem(fluxBiometriaChave(session.user.id));
  if (credId && window.PublicKeyCredential) {
    await fluxBiometriaExigir(credId);
  }
  return session.user.id;
}

async function fluxSignOut() {
  await flux.auth.signOut();
  window.location.href = 'login.html';
}

// ============================================================
// Cadeado local por biometria (Windows Hello / Touch ID / Face ID / digital)
// Usa o WebAuthn do próprio aparelho como confirmação — NÃO substitui a
// password da conta, é só uma camada extra local a este browser/aparelho.
// A credencial fica guardada em localStorage, associada ao user_id: cada
// aparelho tem de ser ativado separadamente em Definições.
// ============================================================
function fluxBiometriaChave(userId) { return `flux_biometria_${userId}`; }

function fluxBiometriaAtiva(userId) {
  return !!localStorage.getItem(fluxBiometriaChave(userId));
}

function fluxBiometriaSuportada() {
  return !!window.PublicKeyCredential;
}

function fluxBufferParaBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fluxBase64ParaBuffer(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

// Regista uma nova credencial biométrica neste aparelho para este utilizador.
async function fluxBiometriaAtivar(userId, email) {
  if (!fluxBiometriaSuportada()) throw new Error('Este aparelho ou browser não suporta biometria.');
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Flux' },
      user: { id: new TextEncoder().encode(userId), name: email || 'utilizador', displayName: email || 'utilizador' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
      attestation: 'none'
    }
  });
  if (!cred) throw new Error('Não foi possível criar a credencial.');
  localStorage.setItem(fluxBiometriaChave(userId), fluxBufferParaBase64(cred.rawId));
}

function fluxBiometriaDesativar(userId) {
  localStorage.removeItem(fluxBiometriaChave(userId));
}

// Pede confirmação biométrica com a credencial guardada. Devolve true/false.
async function fluxBiometriaConfirmar(credId) {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: fluxBase64ParaBuffer(credId), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000
      }
    });
    return true;
  } catch (e) {
    return false;
  }
}

// Mostra um ecrã de bloqueio de página inteira até a biometria ser confirmada
// (ou o utilizador terminar sessão a partir daí). Bloqueia a execução da página.
function fluxBiometriaExigir(credId) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'fluxLockOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:#EAF0EE;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:"IBM Plex Sans",sans-serif;padding:24px;text-align:center;';
    overlay.innerHTML = `
      <div style="font-size:40px;">🔒</div>
      <div style="font-size:15px;font-weight:600;color:#17262B;">Flux está bloqueado</div>
      <div id="fluxLockMsg" style="font-size:12.5px;color:#4E6167;min-height:16px;"></div>
      <button id="fluxLockBtn" style="padding:12px 26px;border-radius:999px;border:none;background:#1F6F78;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Desbloquear</button>
      <button id="fluxLockSairBtn" style="background:none;border:none;color:#8A9A9C;font-size:12.5px;cursor:pointer;text-decoration:underline;margin-top:8px;">Terminar sessão</button>
    `;
    document.body.appendChild(overlay);

    const msg = overlay.querySelector('#fluxLockMsg');
    overlay.querySelector('#fluxLockBtn').addEventListener('click', async () => {
      msg.textContent = '';
      const ok = await fluxBiometriaConfirmar(credId);
      if (ok) {
        overlay.remove();
        resolve();
      } else {
        msg.textContent = 'Não foi possível confirmar. Tenta outra vez.';
      }
    });
    overlay.querySelector('#fluxLockSairBtn').addEventListener('click', fluxSignOut);
  });
}
