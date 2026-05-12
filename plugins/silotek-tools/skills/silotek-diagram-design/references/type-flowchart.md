# 플로차트 (Flowchart)

**적합한 곳:** 결정 로직, 알고리즘, 사용자 대상 분기 흐름, 온보딩 라우팅, 지원 트리아지 트리.

## 레이아웃 규칙

- 색이 아니라 도형이 타입을 나타낸다: 타원은 시작/끝, 사각형은 단계/행동, 마름모는 결정, 작은 채움 점은 병합 지점.
- 흐름은 위->아래로 흐른다. 마름모에서 관례적 출구는 "예" 오른쪽, "아니오" 아래지만, 모든 나가는 화살표에 라벨을 단다.
- 결정 마름모는 출구 3개 안팎을 편집형 기본값으로 삼는다. 브리프가 더 많은 분기를 요구하면 그룹핑하거나 중첩 마름모로 나누고, 분기를 버리지 않는다.
- teal은 happy path 또는 가장 결과가 큰 단 하나의 결정에 쓴다.
- 두 화살표가 꼭 교차해야 하면 한쪽에 작은 arc 점프를 줘서 교차가 읽히게 한다.

## 안티패턴

- 채움 색으로 노드 타입을 신호하는 방식. 타입은 도형이 한다.
- 라벨 없는 결정 분기.
- 모든 분기를 한 마름모에 밀어 넣어 1152px에서 읽히지 않는 구조.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300">
  <defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#1e3a5f"/></marker></defs>
  <rect width="520" height="300" fill="#f8fafc"/>
  <rect x="190" y="28" width="140" height="44" rx="22" fill="#ffffff" stroke="#1e3a5f"/>
  <path d="M260 104 L330 152 L260 200 L190 152 Z" fill="#ffffff" stroke="#2c8d8a" stroke-width="2"/>
  <rect x="72" y="232" width="136" height="44" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="312" y="232" width="136" height="44" rx="6" fill="#e8f5f5" stroke="#2c8d8a"/>
  <path d="M260 72 V104 M210 170 L158 232 M310 170 L362 232" fill="none" stroke="#1e3a5f" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="260" y="56" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="14" fill="#0f172a">입력 수신</text>
  <text x="260" y="157" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">검증됨?</text>
  <text x="140" y="259" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">보류</text>
  <text x="380" y="259" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" font-weight="700" fill="#1e3a5f">저장</text>
</svg>
```
