# 타임라인 (Timeline)

**적합한 곳:** 릴리스 이력, 프로젝트 마일스톤, 사고 타임라인, 로드맵, 체인지로그 시각화.

## 레이아웃 규칙

- 가운데를 가로지르는 가로 헤어라인 기준선을 둔다.
- 시간 경계(분기, 월, 스프린트)마다 눈금과 날짜 라벨을 둔다.
- 이벤트는 기준선 위의 작은 채움 원으로 표시한다. 라벨은 충돌을 막기 위해 위아래를 번갈아 두고, 낙하선으로 원과 잇는다.
- 주요 마일스톤은 teal 원과 굵은 라벨로 표시한다.
- 시간 척도는 정직해야 한다. 간격이 균등하지 않으면 원도 균등하지 않게 띄운다. 한 구간이 너무 빽빽하면 축을 눈에 띄게 끊는다.
- 편집형 기본값보다 이벤트가 많으면 월/분기 타일로 묶고, 근거 이벤트를 버리지 않는다.

## 안티패턴

- 시간상 균등하지 않은 이벤트를 균등 간격으로 배치.
- 축 라벨 누락.
- 세로 오프셋 없이 빽빽한 라벨을 한 줄에 몰아넣는 방식.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220">
  <rect width="640" height="220" fill="#f8fafc"/>
  <line x1="64" y1="112" x2="576" y2="112" stroke="#1e3a5f" stroke-width="2"/>
  <circle cx="112" cy="112" r="5" fill="#6b7280"/><circle cx="276" cy="112" r="6" fill="#2c8d8a"/><circle cx="508" cy="112" r="5" fill="#6b7280"/>
  <path d="M112 112 V72 M276 112 V154 M508 112 V72" stroke="#cbd5e1"/>
  <text x="112" y="60" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">초안</text>
  <text x="276" y="176" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" font-weight="700" fill="#1e3a5f">검증</text>
  <text x="508" y="60" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">배포</text>
  <text x="112" y="136" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="11" fill="#6b7280">5/10</text>
  <text x="508" y="136" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="11" fill="#6b7280">5/12</text>
</svg>
```
