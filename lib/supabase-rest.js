const SUPABASE_REST_PREFIX = '/rest/v1';

export function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
}

export function getSupabaseServiceRoleKey() {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

function parseSupabasePayload(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      message: text,
    };
  }
}

export async function requestSupabase(path, options) {
  const headers = {
    apikey: getSupabaseServiceRoleKey(),
    Authorization: `Bearer ${getSupabaseServiceRoleKey()}`,
    Accept: 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${getSupabaseUrl()}${SUPABASE_REST_PREFIX}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = parseSupabasePayload(text);

  if (!response.ok) {
    const message =
      payload && payload.message
        ? payload.message
        : payload && payload.error_description
          ? payload.error_description
          : `Supabase request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export function encodeFilterValue(value) {
  return encodeURIComponent(String(value));
}
