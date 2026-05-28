# Fanstage (algopartners) — Claude 작업 가이드

`CLAUDE.md` → `AGENTS.md`(Expo v54)를 따르고, 이 문서는 **이 레포에서 실수 줄이기 + 실행 방법**을 정리합니다.

## 프로젝트 한 줄

팬이 공연장 슬롯에 **지지(backing)** 하면 무대가 열리는 모바일 프로토타입. UI·상태는 거의 전부 **`App.tsx` 단일 파일** (~5k lines).

## 스택

| 항목 | 버전/비고 |
|------|-----------|
| Expo | ~54 — **반드시** [v54 문서](https://docs.expo.dev/versions/v54.0.0/) 기준 |
| React / RN | 19 / 0.81 |
| 진입점 | `index.ts` → `App.tsx` |
| 비디오 | `expo-video` (`assets/hero-bg.mp4`) |
| 라우터 | `expo-router` 플러그인 있으나 현재 화면은 `App.tsx` 내부 탭/오버레이 |

## 로컬 실행

```bash
# 1) Metro (터미널 하나에 유지)
npm start

# 2) 다른 터미널에서 QR + URL (LAN IP 자동)
npm run qr

# 3) 앱 리로드 (셸에서 r 단독 입력 금지)
npm run reload
# 또는
npm run r
```

- 실기기: **Expo Go**, PC와 **같은 Wi‑Fi**
- `npm run qr` 출력의 `exp://…:8081` 스캔
- **리로드:** `npm run reload` / `npm run r` (App.tsx touch → Metro 재번들)
- `npm start`가 돌아가는 **그 터미널**에서 `r`도 가능
- 셸에서 `r`만 치면 zsh **직전 명령 반복** (QR만 다시 나옴) — `npm run r` 사용
- `npm start` 터미널: `m` 개발 메뉴
- 시뮬레이터 `simctl` 오류는 Xcode 미설치 시 흔함 → 실기기 테스트로 충분

## Codex ↔ Claude 파이프라인

`코덱스랑클코.md` 참고.

| 명령 | 역할 | 할 일 |
|------|------|--------|
| `/plan` | 아키텍트 | 설계만. **코드 작성 금지** |
| `/code` | 개발자 | 설계 기반 구현. 에러 처리·주석 포함 |

설계 없이 큰 기능을 `App.tsx`에 바로 넣지 말 것.

## 이 레포에서 코드 짤 때

1. **범위**: 요청한 화면/플로우만. 인접 스타일·리팩터 “겸사겸사” 금지.
2. **파일**: 기본은 `App.tsx`만 수정. 새 파일은 사용자가 요청했을 때만.
3. **스타일**: 기존 `C`, `SPACE`, `ROLE`, `StyleSheet` 패턴 유지.
4. **타입**: `VenueCompetition`, `Overlay`, `Tab` 등 기존 union/type 재사용. 새 헬퍼는 **선언 후 사용** (ReferenceError 방지).
5. **JSX**: IIFE `(() => { ... })()` 블록 닫는 괄호·`</>` 짝 맞추기 — 파서 오류는 대개 괄호 불일치.
6. **검증**: 저장 후 Metro 로그에 `Bundled` + 런타임 `ERROR` 없는지 확인.

## 도메인 맵 (App.tsx)

- **탭**: `discover` | `tickets` | `profile`
- **오버레이**: `venueDetail`, `backingFlow`, `artistDetail`, … (`type Overlay`)
- **역할 색**: `ROLE.fan` / `artist` / `venue` / `curator`
- **핵심 플로우**: 공연장 카드 → 상세 → backing → 확인 → 티켓/QR

수정 전 해당 `Overlay` / 컴포넌트 블록을 grep으로 찾고, 같은 파일 안에서만 일관되게 바꿀 것.

## LLM 공통 원칙 (요약)

**Think before coding** — 가정·해석이 여러 개면 물어보고, 더 단순한 방법이 있으면 말할 것.

**Simplicity** — 요청 밖 기능·추상화·“나중을 위한” 설정 금지.

**Surgical changes** — diff의 모든 줄이 사용자 요청과 직결되어야 함. 내가 만든 unused import만 정리.

**Goal-driven** — “고쳐줘” → 재현 조건 + Metro에서 에러 사라짐까지가 완료.

## 자주 나온 실수 (이 세션 기준)

- `Property '…' doesn't exist` — 함수/변수를 사용하기 전에 같은 스코프에 정의했는지 확인
- `Cannot read property 'find' of undefined` — mock 배열·optional 체인
- `TransformError` / `expected "}"` — JSX 중첩·IIFE 닫는 부분

---

**이 문서가 잘 작동하면:** `npm run qr`로 바로 기기 연결, `App.tsx`는 작은 diff로 안정적으로 수정, `/plan`과 `/code` 역할이 섞이지 않음.
