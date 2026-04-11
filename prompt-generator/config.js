window.PROMPT_GENERATOR_CONFIG = Object.assign(
  {
    translateApiUrl: '/api/translate',
    model: 'claude-sonnet-4-20250514',
  },
  window.PROMPT_GENERATOR_CONFIG || {}
);
