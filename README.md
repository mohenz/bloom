# bloom

프롬프트 생성기 정적 프런트와 번역 API 서버 코드를 함께 담는 저장소입니다.

## 구조

- `index.html`: GitHub Pages용 정적 앱 진입점
- `prompt-generator/`: 스타일, 데이터, 도메인 로직, 서비스, 저장소, UI 모듈
- `server/translate-api.mjs`: Anthropic 기반 번역 API 서버

## 프런트 설정

정적 페이지는 `prompt-generator/config.js`의 `translateApiUrl` 값을 읽어 번역 API를 호출합니다.

예시:

```js
window.PROMPT_GENERATOR_CONFIG = {
  translateApiUrl: 'https://your-api.example.com/api/translate',
  model: 'claude-sonnet-4-20250514'
};
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

- GitHub Pages는 정적 호스팅만 가능하므로 `server/translate-api.mjs`는 별도 Node 런타임에 배포해야 합니다.
- Pages 프런트는 이미 `https://mohenz.github.io/bloom/` 에 배포되어 있습니다.
- API를 별도로 배포한 뒤 `prompt-generator/config.js`의 `translateApiUrl`을 그 주소로 바꾸고 다시 푸시하면 됩니다.
