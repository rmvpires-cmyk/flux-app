// ============================================================
// FLUX — Cloudflare Pages Function
// Extrai transações de um PDF de extrato bancário usando a API da
// Anthropic (Claude), do lado do servidor — a chave de API nunca
// chega ao browser.
//
// Requer estas variáveis de ambiente no projeto Cloudflare Pages
// (Settings → Environment variables), tipo "Secret":
//   ANTHROPIC_API_KEY   — chave gerada em console.anthropic.com
//   SUPABASE_URL         — mesmo valor de app/config.js
//   SUPABASE_ANON_KEY    — mesmo valor de app/config.js
// ============================================================

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Confirma que quem chama tem sessão Flux válida (evita que
    //    qualquer pessoa na internet gaste os teus créditos Anthropic).
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return jsonResponse({ error: 'Não autenticado.' }, 401);
    }

    const userResp = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': env.SUPABASE_ANON_KEY
      }
    });
    if (!userResp.ok) {
      return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401);
    }

    // 2. Lê o PDF (base64) enviado pelo browser.
    const body = await request.json();
    const { pdfBase64 } = body || {};
    if (!pdfBase64) {
      return jsonResponse({ error: 'Ficheiro em falta.' }, 400);
    }

    // 3. Pede à Anthropic para extrair as transações em JSON.
    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
            },
            {
              type: 'text',
              text: 'Extrai todas as transações (movimentos) deste extrato bancário. ' +
                'Responde APENAS com um array JSON válido, sem nenhum texto à volta, ' +
                'neste formato exato: [{"data":"AAAA-MM-DD","descricao":"texto","valor":numero}]. ' +
                'Regra do sinal do "valor": positivo para receitas/créditos (dinheiro que entra na conta), ' +
                'negativo para despesas/débitos (dinheiro que sai da conta). ' +
                'Usa sempre ponto como separador decimal no JSON (nunca vírgula). ' +
                'Não incluas linhas de saldo inicial/final, só movimentos individuais. ' +
                'Se não conseguires ler alguma linha com confiança, ignora-a.'
            }
          ]
        }]
      })
    });

    if (!anthropicResp.ok) {
      const errTxt = await anthropicResp.text();
      return jsonResponse({ error: 'Erro ao contactar a IA: ' + errTxt }, 502);
    }

    const data = await anthropicResp.json();
    const textoResposta = (data.content && data.content[0] && data.content[0].text) || '';
    const match = textoResposta.match(/\[[\s\S]*\]/);
    if (!match) {
      return jsonResponse({ error: 'Não foi possível interpretar a resposta da IA.' }, 502);
    }

    let transacoes;
    try {
      transacoes = JSON.parse(match[0]);
    } catch (e) {
      return jsonResponse({ error: 'A resposta da IA não é um JSON válido.' }, 502);
    }

    return jsonResponse({ transacoes }, 200);
  } catch (e) {
    return jsonResponse({ error: String(e && e.message ? e.message : e) }, 500);
  }
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
