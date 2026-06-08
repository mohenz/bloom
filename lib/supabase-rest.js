import pg from 'pg';

const { Pool } = pg;
const SUPABASE_REST_PREFIX = '/rest/v1';

let pgPool = null;

function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pgPool;
}

export function isLocalPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
}

export function getSupabaseServiceRoleKey() {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
}

export function isSupabaseConfigured() {
  return Boolean(isLocalPostgresConfigured() || (getSupabaseUrl() && getSupabaseServiceRoleKey()));
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

async function executeLocalPostgresQuery(path, options) {
  const qMarkIndex = path.indexOf('?');
  const tableName = qMarkIndex === -1 ? path.slice(1) : path.slice(1, qMarkIndex);
  const queryString = qMarkIndex === -1 ? '' : path.slice(qMarkIndex + 1);
  const params = new URLSearchParams(queryString);

  const pool = getPgPool();
  let sql = '';
  const vals = [];

  const method = (options.method || 'GET').toUpperCase();

  if (method === 'GET') {
    const conditions = [];
    for (const [key, val] of params.entries()) {
      if (key === 'select' || key === 'order' || key === 'limit') continue;
      if (key === 'or') {
        const match = val.match(/^\((.+)\)$/);
        if (match) {
          const subConditions = [];
          const parts = match[1].split(',');
          for (const part of parts) {
            const dotIdx = part.indexOf('.');
            const col = part.slice(0, dotIdx);
            const subValPart = part.slice(dotIdx + 1);
            if (subValPart.startsWith('eq.')) {
              vals.push(decodeURIComponent(subValPart.slice(3)));
              subConditions.push(`"${col}" = $${vals.length}`);
            } else if (subValPart === 'is.null') {
              subConditions.push(`"${col}" IS NULL`);
            }
          }
          conditions.push(`(${subConditions.join(' OR ')})`);
        }
      } else {
        if (val.startsWith('eq.')) {
          vals.push(decodeURIComponent(val.slice(3)));
          conditions.push(`"${key}" = $${vals.length}`);
        } else if (val === 'is.null') {
          conditions.push(`"${key}" IS NULL`);
        }
      }
    }

    let orderBy = '';
    const orderParam = params.get('order');
    if (orderParam) {
      const [col, dir] = orderParam.split('.');
      orderBy = `ORDER BY "${col}" ${dir.toUpperCase()}`;
    }

    let limitClause = '';
    const limitParam = params.get('limit');
    if (limitParam) {
      limitClause = `LIMIT ${parseInt(limitParam, 10)}`;
    }

    const selectFields = params.get('select') 
      ? params.get('select').split(',').map(f => `"${f}"`).join(', ') 
      : '*';

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    sql = `SELECT ${selectFields} FROM public."${tableName}" ${whereClause} ${orderBy} ${limitClause}`;
  } 
  else if (method === 'POST') {
    const cols = [];
    const valPlaceholders = [];
    for (const [col, val] of Object.entries(options.body || {})) {
      cols.push(`"${col}"`);
      vals.push(val);
      valPlaceholders.push(`$${vals.length}`);
    }
    sql = `INSERT INTO public."${tableName}" (${cols.join(', ')}) VALUES (${valPlaceholders.join(', ')}) RETURNING *`;
  } 
  else if (method === 'PATCH') {
    const setClauses = [];
    for (const [col, val] of Object.entries(options.body || {})) {
      vals.push(val);
      setClauses.push(`"${col}" = $${vals.length}`);
    }

    const conditions = [];
    for (const [key, val] of params.entries()) {
      if (key === 'select' || key === 'order' || key === 'limit') continue;
      if (key === 'or') {
        const match = val.match(/^\((.+)\)$/);
        if (match) {
          const subConditions = [];
          const parts = match[1].split(',');
          for (const part of parts) {
            const dotIdx = part.indexOf('.');
            const col = part.slice(0, dotIdx);
            const subValPart = part.slice(dotIdx + 1);
            if (subValPart.startsWith('eq.')) {
              vals.push(decodeURIComponent(subValPart.slice(3)));
              subConditions.push(`"${col}" = $${vals.length}`);
            } else if (subValPart === 'is.null') {
              subConditions.push(`"${col}" IS NULL`);
            }
          }
          conditions.push(`(${subConditions.join(' OR ')})`);
        }
      } else {
        if (val.startsWith('eq.')) {
          vals.push(decodeURIComponent(val.slice(3)));
          conditions.push(`"${key}" = $${vals.length}`);
        } else if (val === 'is.null') {
          conditions.push(`"${key}" IS NULL`);
        }
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    sql = `UPDATE public."${tableName}" SET ${setClauses.join(', ')} ${whereClause} RETURNING *`;
  } 
  else if (method === 'DELETE') {
    const conditions = [];
    for (const [key, val] of params.entries()) {
      if (key === 'select' || key === 'order' || key === 'limit') continue;
      if (key === 'or') {
        const match = val.match(/^\((.+)\)$/);
        if (match) {
          const subConditions = [];
          const parts = match[1].split(',');
          for (const part of parts) {
            const dotIdx = part.indexOf('.');
            const col = part.slice(0, dotIdx);
            const subValPart = part.slice(dotIdx + 1);
            if (subValPart.startsWith('eq.')) {
              vals.push(decodeURIComponent(subValPart.slice(3)));
              subConditions.push(`"${col}" = $${vals.length}`);
            } else if (subValPart === 'is.null') {
              subConditions.push(`"${col}" IS NULL`);
            }
          }
          conditions.push(`(${subConditions.join(' OR ')})`);
        }
      } else {
        if (val.startsWith('eq.')) {
          vals.push(decodeURIComponent(val.slice(3)));
          conditions.push(`"${key}" = $${vals.length}`);
        } else if (val === 'is.null') {
          conditions.push(`"${key}" IS NULL`);
        }
      }
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    sql = `DELETE FROM public."${tableName}" ${whereClause} RETURNING *`;
  }

  const serializedVals = vals.map(val => (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val);

  const client = await pool.connect();
  try {
    const queryResult = await client.query(sql, serializedVals);
    return queryResult.rows;
  } finally {
    client.release();
  }
}

export async function requestSupabase(path, options) {
  if (isLocalPostgresConfigured()) {
    return executeLocalPostgresQuery(path, options);
  }

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
