(function registerPromptGeneratorServices(global) {
  function getConfig() {
    return global.PROMPT_GENERATOR_CONFIG || {};
  }

  function normalizeEndpoint(apiUrl) {
    return String(apiUrl || '').trim().replace(/\/+$/, '');
  }

  async function translatePromptToEnglish(prompt) {
    const config = getConfig();
    const apiUrl = normalizeEndpoint(config.translateApiUrl);

    if (!apiUrl) {
      throw new Error('번역 API URL이 설정되지 않았습니다. prompt-generator/config.js 에 translateApiUrl 값을 넣어주세요.');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        model: config.model || 'claude-sonnet-4-20250514',
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data && data.error && data.error.message
        ? data.error.message
        : '번역 요청에 실패했습니다.';
      throw new Error(message);
    }

    const translatedText = data && typeof data.translatedText === 'string'
      ? data.translatedText.trim()
      : '';

    if (!translatedText) {
      throw new Error('번역 결과가 비어 있습니다.');
    }

    return translatedText;
  }

  global.PromptGeneratorServices = {
    translatePromptToEnglish,
  };
})(window);
