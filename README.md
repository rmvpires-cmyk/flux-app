# Flux

App pessoal de gestão financeira — orçamento por categoria, receitas, despesas, digitalização de faturas, calendário de pagamentos. HTML/CSS/JS puro (sem build), ligado ao Supabase diretamente no browser.

## Configuração

1. Edita `config.js` e substitui os dois valores pelos do teu projeto Supabase "Flux":
   - `SUPABASE_URL` — Project Settings → API → Project URL
   - `SUPABASE_ANON_KEY` — Project Settings → API → anon public key

   A chave `anon` é segura de expor no browser: todo o acesso aos dados é controlado por Row Level Security (RLS), definido no schema (`flux_schema_v2.sql`). Sem sessão autenticada, esta chave sozinha não lê nem escreve nada.

2. No Supabase, em **Authentication → URL Configuration**, adiciona o URL do site publicado (ex. `https://flux-app.pages.dev`) a **Site URL** e a **Redirect URLs**.

## Estrutura

- `login.html` — entrar / criar conta
- `index.html` — Início (saldo, orçamento por categoria, próximos pagamentos)
- `orcamento.html`, `calendario.html`, `movimentos.html`, `digitalizar.html` — placeholders, por desenhar
- `style.css` — identidade visual partilhada
- `supabase-client.js` — inicialização do cliente e verificação de sessão
- `config.js` — chaves do projeto Supabase (por preencher)

## Publicação (Cloudflare Pages)

Site estático sem build: Framework preset **None**, build command vazio, output directory `/`.
