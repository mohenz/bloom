import { DEFAULT_MODEL } from '../lib/translate-prompt.js';

export default function handler(_request, response) {
  response.status(200).json({
    ok: true,
    model: DEFAULT_MODEL,
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY || ''),
  });
}
