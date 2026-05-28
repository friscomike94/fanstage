# fanstage Design Philosophy

## 1. Product Feeling

fanstage는 티켓 앱이 아니라, 팬들이 공연을 만들어낸 과정을 증명하는 제품이다.

화면은 항상 이 질문에 답해야 한다:

- 지금 이 공연은 어떤 상태인가?
- 나는 여기에 어떻게 기여했는가?
- 다음 행동은 무엇인가?
- 이 행동이 공연을 얼마나 앞으로 밀어주는가?

핵심 감정:
“내가 누른 것이 공연이 되었다.”

## 2. Design Principles

### 1. Status First
모든 카드와 화면은 상태를 먼저 보여준다.

예:
- 모집 중
- 성사 임박
- 공연 확정
- 티켓 전환 가능
- 입장 준비 완료
- 공연 종료

상태는 장식이 아니라 UX의 중심이다.

### 2. One Screen, One Main Action
한 화면에는 가장 중요한 CTA 하나만 강하게 둔다.

예:
- 참여하기

- 예치하기
- 내 티켓 받기
- 친구 초대하기
- 입장권 보기

보조 행동은 조용하게 둔다.

### 3. Fan Credit Is The Moat
fanstage만 줄 수 있는 가치는 “내가 이 공연을 만들었다”는 기록이다.

반복 문구:
- 서울 팬 94명이 만든 공연
- Founding fans가 만든 무대
- 우리가 불렀고, 이제 같이 완성합니다
- 당신의 참여가 공연으로 바뀌었습니다

### 4. Cards Must Have One Job
카드는 한 가지 역할만 가진다.

카드 종류:
- Stage Card: 공연/캠페인 요약
- Status Card: 현재 진행 상태
- Proof Card: 팬 수, 달성률, 전환 가능 여부
- Action Card: 다음 행동 안내
- Ticket Card: 티켓/입장 정보
- Story Card: 왜 이 무대가 의미 있는지

한 카드 안에 설명, CTA, 통계, 감정문구를 다 넣지 않는다.

## 3. Visual System

### Color Roles
색은 감정이 아니라 상태를 뜻해야 한다.

- Green: 확정, 완료, 가능, 성공
- Pink: 팬 감정, 도시가 부르는 느낌, campaign spark
- Yellow: Founding fan, special status, reward
- Blue/Slate: 기본 배경, 정보, 대기 상태
- Red: 실패, 환불 필요, 취소

### Typography
큰 글자는 “상태와 결과”에만 쓴다.

예:
- 미누 @ 롤링홀 확정

- 94 founding fans
- 내 티켓 받기

설명문은 짧고 낮게 둔다.

### Buttons
Primary CTA는 화면당 하나.

Primary:
- 초록 배경
- 명확한 동사
- 짧은 문장

Secondary:
- 어두운 배경

- 테두리 또는 낮은 대비
- 보조 행동

## 4. Copy Rules

### Good Copy
짧고, 상태가 있고, 행동으로 이어진다.

예:
- 예치금이 티켓으로 전환됐어요
- 서울 팬 94명이 만든 공연
- 내 티켓 받기
- 친구 초대하기
- 공연 확정

### Avoid
장황한 설명, 마케팅 문구, 추상적인 슬로건.

피해야 할 표현:
- 특별한 경험을 제공합니다
- 팬과 아티스트를 연결합니다
- 새로운 공연 문화를 만듭니다

제품 안에서는 철학보다 상태가 먼저다.

## 5. Reusable UI Patterns

### Stage Status Badge
모든 공연 카드 상단에 상태 badge를 둔다.

예:
- 모집 중
- 성사 임박
- 공연 확정
- 티켓 전환 가능
- 입장 준비

### Progress Block
진행률은 숫자와 의미를 같이 보여준다.

예:
94 founding fans
목표 달성 100%
입장권 전환 가능

### Conversion Notice
예치금/참여가 티켓으로 바뀌는 순간은 반드시 별도 카드로 보여준다.

예:
예치금이 티켓으로 전환됐어요
3만원 예치 → 롤링홀 입장권

### Bottom Action Bar
결정적인 행동은 하단 고정 영역에 둔다.

예:
[내 티켓 받기]
[친구 초대하기]

## 6. Screen Philosophy By Stage

### Recruiting
목표:
팬이 “이 공연을 내가 만들 수 있다”고 느끼게 한다.

Main CTA:
참여하기 / 예치하기

### Almost There
목표:
부족한 인원을 명확히 보여주고 공유를 유도한다.

Main CTA:
친구 초대하기

### Confirmed
목표:
팬에게 성취감과 다음 행동을 준다.

Main CTA:
내 티켓 받기

### Ticket Ready
목표:
불안 없이 입장 준비 상태를 보여준다.

Main CTA:
입장권 보기

### Completed

목표:
기록과 자부심을 남긴다.

Main CTA:
내 서포터 기록 보기 / 다음 공연 보기

UI는 공연 정보를 보여주는 게 아니라, 팬의 참여가 공연으로 바뀌는 증거를 보여준다.