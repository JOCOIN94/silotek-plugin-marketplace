# 상태 기계 (State Machine)

**적합한 곳:** 유한 상태 로직, 주문 상태, 인증 상태, 연결 수명주기, 폼 마법사, 작업 큐 상태.

## 레이아웃 규칙

- 상태는 둥근 사각형(`rx=8`)으로 라벨링한다.
- 시작은 ink 채움 점, 끝은 링 점으로 표시한다.
- 전이는 곡선 또는 직선 화살표이며 `event [guard] / action` 라벨을 단다. 필요 없는 부분은 생략한다.
- 자기 루프는 상태 위로 곡선을 그린다.
- 지배적 흐름 방향(좌->우 또는 위->아래)으로 정렬하고, 전이가 교차하기 전에 재배치한다.
- teal은 독자가 주목해야 할 상태 하나에 쓴다.
- 전이가 상태 수보다 훨씬 많으면 상태 기계가 둘일 가능성을 검토한다.

## 안티패턴

- "어떤 상태에서든" 전이를 모든 상태에서 반복해 그리는 방식. 단일 주석(`* -> Error on timeout`)을 쓴다.
- 라벨 없는 전이.
- 교차 전이를 해결하지 않고 곡선만 늘리는 방식.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 240">
  <defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#1e3a5f"/></marker></defs>
  <rect width="560" height="240" fill="#f8fafc"/>
  <circle cx="44" cy="112" r="6" fill="#0f172a"/>
  <rect x="92" y="84" width="116" height="56" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="252" y="84" width="116" height="56" rx="8" fill="#e8f5f5" stroke="#2c8d8a"/>
  <rect x="412" y="84" width="116" height="56" rx="8" fill="#ffffff" stroke="#1e3a5f"/>
  <path d="M50 112 H92 M208 112 H252 M368 112 H412" stroke="#1e3a5f" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="150" y="117" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="14" fill="#0f172a">대기</text>
  <text x="310" y="117" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="14" font-weight="700" fill="#1e3a5f">처리</text>
  <text x="470" y="117" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="14" fill="#0f172a">완료</text>
</svg>
```
