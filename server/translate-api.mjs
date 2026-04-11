import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,https://mohenz.github.io')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

function getOriginHeader(origin) {
  if (!origin) {
    return null;
  }
  if (ALLOWED_ORIGINS.has('*') || ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }
  return null;
}

function sendJson(response, statusCode, payload, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };

  const allowedOrigin = getOriginHeader(origin);
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  response.writeHead(statusCode, headers);
  response.end(JSON.stringify(payload));
}

function sendNoContent(response, origin) {
  const headers = {
    Vary: 'Origin',
  };
  const allowedOrigin = getOriginHeader(origin);
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
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

async function requestAnthropicTranslation(prompt, model) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('서버에 ANTHROPIC_API_KEY 가 설정되지 않았습니다.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content:
            '다음 한글 이미지 생성 프롬프트를 Stable Diffusion / Midjourney 등에 사용할 수 있도록 영어 프롬프트로 번역해줘. 쉼표로 구분된 태그 형식으로, 설명 없이 영어 프롬프트만 출력해.\n\n한글 프롬프트: ' +
            prompt,
        },
      ],
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data && data.error && data.error.message
      ? data.error.message
      : 'Anthropic 번역 요청에 실패했습니다.';
    throw new Error(message);
  }

  const translatedText = Array.isArray(data && data.content)
    ? data.content
        .map((block) => block.text || '')
        .join('')
        .trim()
    : '';

  if (!translatedText) {
    throw new Error('번역 결과가 비어 있습니다.');
  }

  return translatedText;
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
        hasApiKey: Boolean(ANTHROPIC_API_KEY),
      },
      origin
    );
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/translate') {
    if (origin && !getOriginHeader(origin)) {
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
