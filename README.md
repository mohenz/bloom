# bloom

프롬프트 생성기 정적 프런트와 번역 API 코드를 함께 담는 저장소입니다.

## 구조

- `index.html`: 정적 앱 진입점
- `prompt-generator/`: 스타일, 데이터, 도메인 로직, 서비스, 저장소, UI 모듈
- `api/translate.js`: Vercel Functions용 번역 API
- `api/healthz.js`: Vercel Functions용 상태 확인 API
- `server/translate-api.mjs`: 로컬 Node 실행용 번역 API 서버
- `lib/translate-prompt.js`: Anthropic 번역 공용 로직

## 프런트 설정

정적 페이지는 `prompt-generator/config.js`의 `translateApiUrl` 값을 읽어 번역 API를 호출합니다.

기본값은 Vercel 같은 동일 도메인 배포를 가정해 `/api/translate`로 설정돼 있습니다.

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
- Vercel 환경변수에 `ANTHROPIC_API_KEY`를 반드시 설정해야 번역 기능이 동작합니다.
- 필요하면 `ALLOWED_ORIGINS`도 설정할 수 있습니다. 기본 예시는 `*`입니다.
- GitHub Pages 배포본은 유지할 수 있지만, 번역 기능은 Vercel 배포본에서 사용하는 것이 맞습니다.
