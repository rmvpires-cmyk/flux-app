// ============================================================
// FLUX — Cloudflare Pages Function
// Extrai os dados de uma fatura/recibo (foto ou PDF) usando a API
// da Anthropic (Claude), do lado do servidor — a chave de API
// nunca chega ao browser. Mesmo padrão de /api/extrair-extrato.js.
//
// Requer as mesmas variáveis de ambiente no projeto Cloudflare
// Pages (Settings → Environment variables), tipo "Secret":
//   ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
// ============================================================

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
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

    const body = await request.json();
    const { ficheiroBase64, mediaType } = body || {};
    if (!ficheiroBase64 || !mediaType) {
      return jsonResponse({ error: 'Ficheiro em falta.' }, 400);
    }

    const ehPdf = mediaType === 'application/pdf';
    const blocoFicheiro = ehPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: ficheiroBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: ficheiroBase64 } };

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            blocoFicheiro,
            {
              type: 'text',
              text: 'Esta imagem/PDF é uma fatura, recibo ou talão de compra. Extrai os dados. ' +
                'Responde APENAS com um objeto JSON válido, sem nenhum texto à volta, neste formato exato: ' +
                '{"fornecedor":"texto ou null","valor":numero ou null,"data_emissao":"AAAA-MM-DD ou null",' +
                '"data_vencimento":"AAAA-MM-DD ou null"}. ' +
                '"fornecedor" é o nome do estabelecimento/empresa que emitiu o documento. ' +
                '"valor" é o valor TOTAL a pagar (usa sempre ponto como separador decimal, nunca vírgula). ' +
                '"data_emissao" é a data do documento. "data_vencimento" só se for uma fatura por pagar com prazo — ' +
                'em recibos/talões já pagos no ato, deixa null. Se não conseguires ler algum campo com confiança, usa null nesse campo.'
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
    const match = textoResposta.match(/\{[\s\S]*\}/);
    if (!match) {
      return jsonResponse({ error: 'Não foi possível interpretar a resposta da IA.' }, 502);
    }

    let dados;
    try {
      dados = JSON.parse(match[0]);
    } catch (e) {
      return jsonResponse({ error: 'A resposta da IA não é um JSON válido.' }, 502);
    }

    return jsonResponse({ dados }, 200);
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
