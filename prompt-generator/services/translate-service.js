(function registerPromptGeneratorServices(global) {
  const API_URL = 'https://api.anthropic.com/v1/messages';
  const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

  function getConfig() {
    return global.PROMPT_GENERATOR_CONFIG || {};
  }

  async function translatePromptToEnglish(prompt) {
    const config = getConfig();
    const apiKey = config.anthropicApiKey;

    if (!apiKey) {
      throw new Error('Anthropic API 키가 설정되지 않았습니다. 배포 전 서버 API 또는 window.PROMPT_GENERATOR_CONFIG.anthropicApiKey를 설정하세요.');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || DEFAULT_MODEL,
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: '다음 한글 이미지 생성 프롬프트를 Stable Diffusion / Midjourney 등에 사용할 수 있도록 영어 프롬프트로 번역해줘. 쉼표로 구분된 태그 형식으로, 설명 없이 영어 프롬프트만 출력해.\n\n한글 프롬프트: ' + prompt,
        }],
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data && data.error && data.error.message
        ? data.error.message
        : '번역 요청에 실패했습니다.';
      throw new Error(message);
    }

    const translatedText = (data.content || [])
      .map(function mapTextBlock(block) {
        return block.text || '';
      })
      .join('')
      .trim();

    if (!translatedText) {
      throw new Error('번역 결과가 비어 있습니다.');
    }

    return translatedText;
  }

  global.PromptGeneratorServices = {
    translatePromptToEnglish,
  };
})(window);
