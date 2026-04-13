# bloom

프롬프트 생성기 정적 프런트와 선택형 영문 생성 로직을 담는 저장소입니다.

## 구조

- `index.html`: 정적 앱 진입점
- `prompt-generator/`: 스타일, 데이터, 도메인 로직, 서비스, 저장소, UI 모듈
- `api/auth/*.js`: 일반 이메일/비밀번호 로그인 API
- `api/translate.js`: 선택 사항인 Vercel Functions용 번역 API
- `api/healthz.js`: 선택 사항인 Vercel Functions용 상태 확인 API
- `lib/auth-*.js`: 일반 로그인 공통 유틸과 저장소 어댑터
- `server/translate-api.mjs`: 선택 사항인 로컬 Node 실행용 번역 API 서버
- `lib/translate-prompt.js`: 선택 사항인 Anthropic 번역 공용 로직

## 프런트 기능

- 이메일/비밀번호 기반 일반 로그인
- 한글 태그형 프롬프트 생성
- 문장 연결 기능
- 선택값 기반 영문 프롬프트 생성
- 선택값 기반 영문 문장형 프롬프트 생성
- Prompt History 저장, 불러오기, 수정, 삭제

현재 기본 프런트는 외부 API 없이 동작합니다. 따라서 `ANTHROPIC_API_KEY` 없이도 영문 프롬프트를 생성할 수 있습니다.

## 로그인 구성

- 프런트는 `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` 만 호출합니다.
- 사용자 저장소는 현재 `Supabase Postgres` 를 임시 저장소로 사용하지만, 프런트는 Supabase에 직접 의존하지 않습니다.
- 따라서 이후 다른 DB나 백엔드로 바꾸더라도 `lib/auth-store.js` 와 `api/auth/*.js` 만 교체하면 됩니다.

## 일반 로그인 사전 작업

1. Supabase SQL Editor 에 [docs/general_login_auth_schema.sql](./docs/general_login_auth_schema.sql) 내용을 실행합니다.
2. 이어서 [docs/prompt_history_schema.sql](./docs/prompt_history_schema.sql) 내용을 실행합니다.
3. 아래 명령으로 비밀번호 해시를 생성합니다.

```bash
node scripts/generate-password-hash.mjs "your-password"
```

4. 생성된 해시를 사용해 `public.app_users` 에 초기 계정을 넣습니다.
5. 배포 환경 변수에 아래 값을 설정합니다.

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AUTH_SESSION_SECRET=long_random_secret
AUTH_SESSION_TTL_SECONDS=604800
```

## API 서버 실행

1. `.env.example` 값을 참고해 환경변수를 설정합니다.
2. 아래 명령으로 서버를 실행합니다.

```bash
npm run start:api
```

기본 주소:

- `GET /healthz`
- `POST /api/translate`

요청 예시:

```json
{
  "prompt": "20대 여성, 긴 머리, 카페 배경",
  "model": "claude-sonnet-4-20250514"
}
```

응답 예시:

```json
{
  "translatedText": "young woman in her 20s, long hair, cafe background",
  "model": "claude-sonnet-4-20250514"
}
```

## 배포 메모

- Vercel 프로젝트가 이 GitHub 저장소와 연결되어 있다면, `main` 브랜치 푸시만으로 정적 프런트와 `api/` 함수가 함께 배포됩니다.
- 일반 로그인 기능은 Vercel 환경 변수 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SESSION_SECRET` 설정 후 동작합니다.
- 현재 프런트의 기본 영문 생성 기능에는 `ANTHROPIC_API_KEY`가 필요하지 않습니다.
- Anthropic 기반 번역 API를 별도로 쓰고 싶을 때만 `ANTHROPIC_API_KEY`가 필요합니다.
- 필요하면 `ALLOWED_ORIGINS`도 설정할 수 있습니다. 기본 예시는 `*`입니다.
