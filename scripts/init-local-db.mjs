import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { hashPassword } from '../lib/auth-utils.js';

const { Client } = pg;

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        let val = trimmed.slice(index + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    });
  }
}

async function main() {
  loadEnvFile();

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('오류: .env 파일에 DATABASE_URL이 지정되어 있지 않습니다.');
    console.error('형식: DATABASE_URL=postgresql://[postgres]:[bloom2026!]@[localhost]]:[5432]/["persona-online"]');
    process.exit(1);
  }

  let url;
  try {
    url = new URL(dbUrl);
  } catch (err) {
    console.error('오류: DATABASE_URL 형식이 유효하지 않습니다.');
    process.exit(1);
  }

  const username = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  const host = url.hostname;
  const port = url.port || '5432';
  const databaseName = decodeURIComponent(url.pathname.slice(1));

  if (!databaseName) {
    console.error('오류: DATABASE_URL에 데이터베이스 이름이 포함되어야 합니다.');
    process.exit(1);
  }

  console.log(`로컬 PostgreSQL 연결을 설정합니다...`);
  console.log(`호스트: ${host}:${port}, 사용자: ${username}`);

  // 1. postgres 시스템 DB에 연결하여 대상 DB가 존재하는지 확인하고 없으면 생성합니다.
  const systemClient = new Client({
    host,
    port,
    user: username,
    password,
    database: 'postgres',
  });

  try {
    await systemClient.connect();
  } catch (err) {
    console.error(`오류: 'postgres' 시스템 데이터베이스에 연결하지 못했습니다.`);
    console.error(err.message);
    process.exit(1);
  }

  try {
    const checkDbQuery = 'SELECT 1 FROM pg_database WHERE datname = $1';
    const dbCheckResult = await systemClient.query(checkDbQuery, [databaseName]);

    if (dbCheckResult.rows.length === 0) {
      console.log(`데이터베이스 "${databaseName}"가 존재하지 않아 새로 생성합니다...`);
      // 데이터베이스 이름은 SQL 파라미터화할 수 없으므로 안전한 문자열 포맷팅을 수행합니다.
      await systemClient.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
      console.log(`데이터베이스 "${databaseName}" 생성 완료.`);
    } else {
      console.log(`데이터베이스 "${databaseName}"가 이미 존재합니다.`);
    }
  } catch (err) {
    console.error('오류: 데이터베이스 검사/생성 도중 오류가 발생했습니다.');
    console.error(err.message);
    await systemClient.end();
    process.exit(1);
  } finally {
    await systemClient.end();
  }

  // 2. 생성되거나 확인된 대상 DB에 연결하여 스키마 스크립트를 차례로 실행합니다.
  const targetClient = new Client({
    host,
    port,
    user: username,
    password,
    database: databaseName,
  });

  try {
    await targetClient.connect();
  } catch (err) {
    console.error(`오류: 대상 데이터베이스 "${databaseName}"에 연결하지 못했습니다.`);
    console.error(err.message);
    process.exit(1);
  }

  try {
    await targetClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
      END
      $$;
    `);
    console.log('역할(anon, authenticated) 확인 및 생성 완료.');
  } catch (err) {
    console.warn('경고: 역할(anon, authenticated) 생성 도중 경고/오류가 발생했습니다:', err.message);
  }

  const schemaFiles = [
    'docs/general_login_auth_schema.sql',
    'docs/prompt_history_schema.sql',
    'docs/story_documents_schema.sql'
  ];

  try {
    for (const file of schemaFiles) {
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`스키마 파일이 존재하지 않습니다: ${file}`);
      }

      console.log(`테이블 스키마 생성 중: ${file}...`);
      let sql = fs.readFileSync(filePath, 'utf8');
      if (sql.charCodeAt(0) === 0xFEFF) {
        sql = sql.slice(1);
      }
      await targetClient.query(sql);
    }
    console.log('모든 데이터베이스 테이블 및 인덱스 생성이 완료되었습니다.');

    // 3. 기본 관리자 계정 생성 (존재하지 않는 경우)
    const defaultEmail = 'admin@example.com';
    const defaultPassword = 'adminpassword123';

    const checkUser = await targetClient.query('SELECT 1 FROM public.app_users WHERE email = $1', [defaultEmail]);
    if (checkUser.rows.length === 0) {
      console.log(`기본 관리자 계정 생성 중 (${defaultEmail})...`);
      const passwordHash = await hashPassword(defaultPassword);
      await targetClient.query(
        'INSERT INTO public.app_users (email, password_hash, display_name) VALUES ($1, $2, $3)',
        [defaultEmail, passwordHash, 'Bloom Admin']
      );
      console.log('==================================================');
      console.log('기본 관리자 계정이 성공적으로 생성되었습니다!');
      console.log(`이메일: ${defaultEmail}`);
      console.log(`비밀번호: ${defaultPassword}`);
      console.log('==================================================');
    } else {
      console.log('기본 관리자 계정이 이미 존재하므로 생성을 건너뜁니다.');
    }
  } catch (err) {
    console.error('오류: 테이블 스키마 초기화 도중 오류가 발생했습니다.');
    console.error(err.message);
  } finally {
    await targetClient.end();
  }
}

main();
