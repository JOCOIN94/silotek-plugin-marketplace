# 시퀀스 (Sequence)

**적합한 곳:** 요청/응답 흐름, 프로토콜 교환, 시간에 걸친 다중 행위자 상호작용, API 호출 추적, 사고 재구성.

## 레이아웃 규칙

- 행위자는 상단에 가로로 늘어선 박스들이다.
- lifeline은 각 행위자에서 아래로 내려가는 점선 수직선이다.
- 메시지는 lifeline 사이의 가로 화살표이며, 시간은 위->아래로 흐른다.
- activation bar는 제어권을 쥐는 구간에 걸친 좁은 사각형(`width=8`, muted 채움, 얇은 선)이다. 중첩 호출은 옆으로 쌓는다.
- 자기 메시지는 같은 lifeline으로 되돌아오는 짧은 U자 루프이고, 라벨은 루프 오른쪽에 둔다.
- 반환 메시지는 원래 호출과 같은 색의 점선으로 둔다.
- teal은 주 성공 응답이나 헤드라인 메시지 1~2개에만 쓴다.

## 안티패턴

- 위쪽을 향하는 메시지 화살표. 시간 방향을 거스른다.
- 닫히지 않는 activation bar.
- 다른 lifeline 위에 놓인 라벨.
- lifeline 대신 swimlane 레인을 쓰는 방식. 다른 문법이다.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 300">
  <defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#1e3a5f"/></marker></defs>
  <rect width="620" height="300" fill="#f8fafc"/>
  <rect x="56" y="28" width="120" height="36" rx="6" fill="#ffffff" stroke="#cbd5e1"/><rect x="250" y="28" width="120" height="36" rx="6" fill="#ffffff" stroke="#cbd5e1"/><rect x="444" y="28" width="120" height="36" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <path d="M116 64 V268 M310 64 V268 M504 64 V268" stroke="#6b7280" stroke-dasharray="4,4"/>
  <rect x="306" y="104" width="8" height="96" fill="#e5e7eb" stroke="#cbd5e1"/>
  <path d="M116 112 H306 M314 164 H504 M504 212 H124" fill="none" stroke="#1e3a5f" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="116" y="51" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">클라이언트</text>
  <text x="310" y="51" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">API</text>
  <text x="504" y="51" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">DB</text>
  <text x="210" y="104" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="12" fill="#2c8d8a">요청</text>
</svg>
```
