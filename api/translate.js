import {
  DEFAULT_MODEL,
  getAllowedOrigins,
  getCorsHeaders,
  isOriginAllowed,
  requestAnthropicTranslation,
} from '../lib/translate-prompt.js';

function readBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    return JSON.parse(body);
  }

  return body;
}

export default async function handler(request, response) {
  const origin = request.headers.origin || '';
  const allowedOrigins = getAllowedOrigins();
  const corsHeaders = getCorsHeaders(origin, allowedOrigins);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: { message: 'Method Not Allowed' } });
    return;
  }

  if (!isOriginAllowed(origin, allowedOrigins)) {
    response.status(403).json({ error: { message: '허용되지 않은 Origin 입니다.' } });
    return;
  }

  try {
    const body = readBody(request.body);
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const model = typeof body.model === 'string' ? body.model.trim() : DEFAULT_MODEL;

    if (!prompt) {
      response.status(400).json({ error: { message: 'prompt 값이 필요합니다.' } });
      return;
    }

    if (prompt.length > 5000) {
      response.status(400).json({ error: { message: 'prompt 길이가 너무 깁니다.' } });
      return;
    }

    const translatedText = await requestAnthropicTranslation(prompt, model);
    response.status(200).json({ translatedText, model });
  } catch (error) {
    response.status(500).json({
      error: {
        message: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      },
    });
  }
}
