# 로컬 PostgreSQL 데이터베이스 및 스키마 초기화 가이드

이 문서는 Bloom Universe 로컬 개발 환경 구동을 위해 데이터베이스(`persona-online`)를 생성하고, 스키마 적용 및 기본 관리자 계정을 자동으로 구성하는 데이터베이스 초기화 프로그램(`init-local-db.mjs`)의 사용법과 세부 메커니즘을 설명합니다.

---

## 1. 개요
* **스크립트 경로**: [scripts/init-local-db.mjs](file:///d:/workspace/bloom/scripts/init-local-db.mjs)
* **주요 목적**: 
  1. 로컬 PostgreSQL에 `"persona-online"` 데이터베이스 생성 (존재하지 않는 경우)
  2. 로컬 환경에 필요한 데이터베이스 역할(Role: `anon`, `authenticated`) 자동 생성
  3. 세 개의 스키마 SQL 파일 순차 적용 및 인덱스 빌드
  4. 테스트용 기본 관리자 계정 적재 (Seeding)

---

## 2. 사전 준비 사항

### 2.1 로컬 PostgreSQL 기동
이 초기화 프로그램은 **CineTube 프로젝트**의 로컬 PostgreSQL 환경(포트 `54322`, 패스워드 인증 `trust` 방식)과 환경을 공유합니다.
* 프로젝트 루트에서 **`start-bloom.cmd`**를 실행하면 로컬 DB가 자동으로 준비 및 백그라운드 구동됩니다.

### 2.2 환경 변수(`.env`) 설정
`bloom` 프로젝트 루트 디렉터리에 `.env` 파일을 만들고 아래 설정을 작성합니다.

```env
# 54322 포트를 통해 로컬 PostgreSQL로 접속을 유도
DATABASE_URL=postgresql://postgres:bloom2026!@localhost:54322/persona-online

# 세션 암호화 비밀키 (로그인 기능 활성화를 위해 필수)
AUTH_SESSION_SECRET=a_very_long_and_random_string_for_session_security_12345!
```

> [!NOTE]
> 비밀번호에 `@`와 같은 특수 문자가 들어간 경우 URL 파서 오작동 방지를 위해 `%40` 등으로 URL 인코딩 처리가 필요하나, 스크립트 내부적으로 `decodeURIComponent`를 탑재하여 자동 변환을 지원합니다.

---

## 3. 스크립트 실행 방법

터미널에서 아래 명령을 실행하여 데이터베이스 초기화를 진행합니다.

```bash
node scripts/init-local-db.mjs
```

### 정상 실행 시 출력 예시:
```
로컬 PostgreSQL 연결을 설정합니다...
호스트: localhost:54322, 사용자: postgres
데이터베이스 "persona-online" 생성 완료.
역할(anon, authenticated) 확인 및 생성 완료.
테이블 스키마 생성 중: docs/general_login_auth_schema.sql...
테이블 스키마 생성 중: docs/prompt_history_schema.sql...
테이블 스키마 생성 중: docs/story_documents_schema.sql...
모든 데이터베이스 테이블 및 인덱스 생성이 완료되었습니다.
기본 관리자 계정 생성 중 (admin@example.com)...
==================================================
기본 관리자 계정이 성공적으로 생성되었습니다!
이메일: admin@example.com
비밀번호: adminpassword123
==================================================
```

---

## 4. 핵심 동작 메커니즘 (자동 해결된 이슈)

초기화 스크립트는 로컬 전용 데이터베이스 기동 시 발생할 수 있는 여러 호환성 이슈를 자동으로 감지하고 해결하도록 구현되어 있습니다.

### 4.1 하이픈(`-`) 포함 데이터베이스 이름 처리
PostgreSQL에서는 이름에 하이픈이 포함된 데이터베이스(`persona-online`)를 쿼리로 제어할 때 문법 오류가 납니다. 스크립트는 이를 감지하여 내부적으로 큰따옴표(`"persona-online"`) 안전 이스케이프 처리를 하여 데이터베이스를 생성합니다.

### 4.2 UTF-8 BOM(Byte Order Mark) 자동 제거
일부 윈도우 편집기에서 저장한 SQL 파일 최상단에 포함된 보이지 않는 유니코드 문자(`\ufeff`)는 데이터베이스 쿼리 파서가 구문 오류(`syntax error at or near "create"`)를 발생시킵니다. 스크립트가 로딩 시 BOM 코드를 체크하여 완벽히 정제 후 기동합니다.

### 4.3 Supabase 전용 역할(Role) 가상화
외부 스키마 파일에는 Supabase 권한 정책용 롤(`anon`, `authenticated`)을 대상으로 한 권한 철회(`REVOKE`) 설정이 포함되어 있어, 로컬에 해당 롤이 없으면 실패하게 됩니다. 스크립트는 로컬 PostgreSQL 클러스터에 두 롤이 존재하는지 체크하고, 없는 경우 자동으로 신규 롤을 무해하게 생성하여 오류를 예방합니다.

### 4.4 자동 계정 시딩 및 해싱
회원 테이블 생성 완료 후, `admin@example.com` 계정 존재 여부를 확인합니다. 존재하지 않는 경우 비밀번호(`adminpassword123`)를 내부 보안 룰에 맞춰 scrypt 해시화한 후 데이터베이스에 적재합니다.

---

## 5. 트러블슈팅

### Q1. "postgres" 시스템 데이터베이스 연결 실패 (인증 실패)
* **원인**: `.env` 파일에 지정한 포트(`5432` 등)의 PostgreSQL 서버 비밀번호와 실제 비밀번호가 다를 때 발생합니다.
* **해결**: 기동 포트를 `54322`로 전환해 보시기 바랍니다. `54322` 포트는 로컬 CineTube DB와 연결되는 포트로 패스워드 인증이 면제(`trust`) 설정되어 있어 안전하게 연결을 성공할 수 있습니다.

### Q2. 한글 에러 로그 출력 시 인코딩 깨짐 현상
* **원인**: 윈도우 터미널(CMD/PowerShell)의 인코딩 기본값(CP949)이 Node.js 출력 인코딩(UTF-8)과 맞지 않아 발생합니다.
* **해결**: 스크립트 구동 전 터미널에 아래 명령을 한 번 입력합니다.
  * **PowerShell**: `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`
  * **CMD**: `chcp 65001`
