# 스윔레인 (Swimlane)

**적합한 곳:** 부서 간 프로세스, RACI 스타일 흐름, 벤더 핸드오프, 다중 팀 출시 워크플로우.

## 레이아웃 규칙

- 가로 레인 또는 세로 컬럼을 쓴다. 행위자나 팀마다 하나의 레인을 둔다.
- 레인 라벨은 왼쪽 여백 또는 상단에 짧게 둔다.
- 레인 구분선은 1px 헤어라인이다.
- 프로세스 단계는 그 일을 수행하는 행위자의 레인 안에 배치한다.
- 핸드오프(레인 경계를 가로지르는 화살표)가 가장 중요한 엣지다. 결합도나 지연이 큰 핸드오프에 teal을 고려한다.
- 레인마다 단계 수를 억지로 맞추지 않는다. 단계 하나짜리 레인도 괜찮다.
- 단계가 많으면 시간 구간 타일로 나누고, 소유자 레인은 유지한다.

## 안티패턴

- 라벨 없는 레인.
- 두 레인에 걸쳐 그린 단계. 소유자 하나를 고른다.
- 앞뒤로 구불거리는 화살표. 흐름이 대체로 직선이 되게 단계를 재배치한다.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 300">
  <defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#1e3a5f"/></marker></defs>
  <rect width="640" height="300" fill="#f8fafc"/>
  <path d="M40 92 H600 M40 176 H600" stroke="#cbd5e1"/>
  <text x="56" y="58" font-family="Pretendard, Arial, sans-serif" font-size="12" fill="#6b7280">기획</text>
  <text x="56" y="142" font-family="Pretendard, Arial, sans-serif" font-size="12" fill="#6b7280">개발</text>
  <text x="56" y="226" font-family="Pretendard, Arial, sans-serif" font-size="12" fill="#6b7280">검증</text>
  <rect x="132" y="34" width="116" height="44" rx="6" fill="#ffffff" stroke="#cbd5e1"/><rect x="288" y="118" width="116" height="44" rx="6" fill="#e8f5f5" stroke="#2c8d8a"/><rect x="444" y="202" width="116" height="44" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <path d="M248 56 C272 56 264 140 288 140 M404 140 C428 140 420 224 444 224" fill="none" stroke="#1e3a5f" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="190" y="61" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">요구 정리</text>
  <text x="346" y="145" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" font-weight="700" fill="#1e3a5f">구현</text>
</svg>
```
