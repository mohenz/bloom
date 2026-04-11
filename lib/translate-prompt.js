export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

export function getAllowedOrigins() {
  const rawValue = (process.env.ALLOWED_ORIGINS || '*').trim();
  if (!rawValue) {
    return new Set(['*']);
  }
  return new Set(
    rawValue
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function isOriginAllowed(origin, allowedOrigins = getAllowedOrigins()) {
  if (!origin) {
    return true;
  }
  return allowedOrigins.has('*') || allowedOrigins.has(origin);
}

export function getCorsHeaders(origin, allowedOrigins = getAllowedOrigins()) {
  const headers = {
    Vary: 'Origin',
  };

  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = allowedOrigins.has('*') ? '*' : origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }

  return headers;
}

export async function requestAnthropicTranslation(prompt, model = DEFAULT_MODEL) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    throw new Error('서버에 ANTHROPIC_API_KEY 가 설정되지 않았습니다.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
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
