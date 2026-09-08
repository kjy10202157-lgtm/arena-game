# NEON CLASH 6인 서버 설치

온라인 3대3은 GitHub Pages와 별도로 Cloudflare Worker 서버를 한 번 배포해야 작동합니다.

## 1. 서버 배포

1. Cloudflare 계정을 만들고 Workers & Pages를 엽니다.
2. 이 프로젝트의 `server` 폴더를 Worker 프로젝트로 배포합니다.
3. PC에서 배포할 경우 `server` 폴더에서 다음 명령을 실행합니다.

```bash
npm install
npx wrangler login
npm run deploy
```

4. 완료되면 다음과 비슷한 주소가 표시됩니다.

```text
https://neon-clash-server.계정명.workers.dev
```

## 2. 게임과 서버 연결

`online-config.js`를 열고 받은 주소를 입력합니다.

```js
window.NEON_CLASH_SERVER = "https://neon-clash-server.계정명.workers.dev";
```

수정한 `online-config.js`를 GitHub의 게임 저장소에 다시 업로드합니다.

## 3. 확인

브라우저에서 아래 주소를 열었을 때 JSON이 보이면 서버가 정상입니다.

```text
https://neon-clash-server.계정명.workers.dev/health
```

서로 다른 기기 6대에서 온라인 빠른 대전을 누르면 참가자가 `1/6`부터 증가하고, 6명이 모이면 자동으로 BLUE 3명과 RED 3명으로 배정됩니다.

## 현재 알파 제한

- 실제 사람 6명이 모두 참가해야 경기가 시작됩니다.
- 서버를 새로 배포하면 진행 중인 방은 종료됩니다.
- 연결이 끊긴 자리는 현재 버전에서 AI로 대체되지 않습니다.
- 공개 테스트 전에는 소수의 친구와 지연시간 및 재접속을 먼저 확인하세요.
