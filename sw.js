// ============================================================
// FLUX — service worker
// Só serve para tornar a app instalável no telemóvel (ecrã inicial,
// sem barra de endereço) e para o "shell" (html/css/js/ícones) abrir
// mais depressa. NÃO guarda dados financeiros em cache — os pedidos
// à Supabase e às funções da API vão sempre à rede.
// ============================================================

const CACHE_NOME = 'flux-shell-v1';

const FICHEIROS_SHELL = [
  'style.css',
  'config.js',
  'supabase-client.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(FICHEIROS_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE_NOME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);

  // Só intercetamos pedidos GET ao nosso próprio domínio.
  if (evento.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Nunca cachear chamadas à API (faturas, extratos) — têm de ir sempre à rede.
  if (url.pathname.startsWith('/api/')) return;

  const ehHTML = evento.request.mode === 'navigate' || url.pathname.endsWith('.html');

  if (ehHTML) {
    // Páginas: tenta a rede primeiro (para teres sempre a versão atual),
    // cai para cache só se estiveres offline.
    evento.respondWith(
      fetch(evento.request).catch(() => caches.match(evento.request))
    );
    return;
  }

  // Recursos estáticos (css/js/ícones): cache primeiro, atualiza em segundo plano.
  evento.respondWith(
    caches.match(evento.request).then((resposta) => {
      const buscar = fetch(evento.request).then((rede) => {
        caches.open(CACHE_NOME).then((cache) => cache.put(evento.request, rede.clone()));
        return rede;
      }).catch(() => resposta);
      return resposta || buscar;
    })
  );
});
