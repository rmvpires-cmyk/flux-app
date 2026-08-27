// ============================================================
// FLUX — configuração do cliente Supabase
// ============================================================
// 1. Copia este ficheiro para "config.js" (mesma pasta).
// 2. Preenche os dois valores abaixo com os do TEU projeto Supabase
//    "Flux" (Project Settings → API → Project URL / anon public key).
// 3. "config.js" está no .gitignore — nunca é enviado para o GitHub,
//    para não ficar a chave exposta no histórico do repositório.
//    (A chave anon é segura de expor no browser porque o acesso aos
//    dados é todo controlado por Row Level Security no schema.)
// ============================================================

window.FLUX_CONFIG = {
  SUPABASE_URL: 'https://ftwvzublvyswavaefcva.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0d3Z6dWJsdnlzd2F2YWVmY3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTQ3NTIsImV4cCI6MjEwMzM3MDc1Mn0.1R05x9EsBYpZ236XEpjJjZ5C1s61i5M-_mB4S9F08go'
};
