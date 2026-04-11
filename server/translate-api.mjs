import http from 'node:http';
import {
  DEFAULT_MODEL,
  getAllowedOrigins,
  getCorsHeaders,
  isOriginAllowed,
  requestAnthropicTranslation,
} from '../lib/translate-prompt.js';

const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGINS = getAllowedOrigins();

function sendJson(response, statusCode, payload, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...getCorsHeaders(origin, ALLOWED_ORIGINS),
  };

  response.writeHead(statusCode, headers);
  response.end(JSON.stringify(payload));
}

function sendNoContent(response, origin) {
  const headers = getCorsHeaders(origin, ALLOWED_ORIGINS);
  response.writeHead(204, headers);
  response.end();
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = '';
    request.on('data', (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 1024 * 1024) {
        reject(new Error('요청 본문이 너무 큽니다.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(new Error('JSON 요청 본문 형식이 올바르지 않습니다.'));
      }
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin || '';
  const url = new URL(request.url || '/', `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    sendNoContent(response, origin);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/healthz') {
    sendJson(
      response,
      200,
      {
        ok: true,
        model: DEFAULT_MODEL,
        hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY || ''),
      },
      origin
    );
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/translate') {
    if (!isOriginAllowed(origin, ALLOWED_ORIGINS)) {
      sendJson(response, 403, { error: { message: '허용되지 않은 Origin 입니다.' } }, origin);
      return;
    }

    try {
      const body = await readJsonBody(request);
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      const model = typeof body.model === 'string' ? body.model.trim() : DEFAULT_MODEL;

      if (!prompt) {
        sendJson(response, 400, { error: { message: 'prompt 값이 필요합니다.' } }, origin);
        return;
      }

      if (prompt.length > 5000) {
        sendJson(response, 400, { error: { message: 'prompt 길이가 너무 깁니다.' } }, origin);
        return;
      }

      const translatedText = await requestAnthropicTranslation(prompt, model);
      sendJson(
        response,
        200,
        {
          translatedText,
          model,
        },
        origin
      );
    } catch (error) {
      sendJson(
        response,
        500,
        {
          error: {
            message: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
          },
        },
        origin
      );
    }
    return;
  }

  sendJson(response, 404, { error: { message: 'Not Found' } }, origin);
});

server.listen(PORT, () => {
  console.log(`Prompt translation API listening on http://localhost:${PORT}`);
});
