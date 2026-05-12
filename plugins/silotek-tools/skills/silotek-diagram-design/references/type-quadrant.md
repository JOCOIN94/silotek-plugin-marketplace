# 사분면 (Quadrant)

**적합한 곳:** 우선순위(임팩트 x 노력), 포지셔닝(도달 x 빈도), 포트폴리오 맵, 2x2 결정 프레임.

## 레이아웃 규칙

- 2x2 격자를 기본으로 한다. 축선은 가운데를 지나는 1px 십자다.
- 축 라벨은 Jobs-미니멀 방식으로 둔다. 각 화살표 끝에 단어 하나만 두고, 라벨에 화살표 글리프, 괄호 부연, `HIGH / LOW` 수식어를 넣지 않는다.
- 중점에는 라벨을 달지 않는다.
- 항목은 사분면 안에 배치한 작은 라벨 점(`r=4`)이다. 라벨은 점에서 8~10px 떨어뜨리고 축선을 가로지르지 않게 한다.
- 항목이 셀 안의 이름 붙은 단위라면 점이 아니라 셀 박스로 표현한다. 점은 위치, 셀은 이름 붙은 단위를 뜻한다.
- 편집형 기본값은 항목 12개 안팎이다. 브리프 근거가 더 많으면 점을 클러스터링하거나 셀/범례로 묶되 근거를 버리지 않는다.
- 모서리 태그를 쓰면 축 라벨과 정확히 같은 차원 이름을 써야 한다. 축은 `자동화 / 수동`인데 태그가 `AI 높음 / 낮음`이면 독자는 버그로 읽는다.
- teal은 먼저 볼 항목 또는 focal cell 하나에만 쓴다.

## 안티패턴

- 네 사분면을 서로 다른 색으로 채우는 방식. 위치와 라벨이 해야 할 일을 색이 흐린다.
- 축선 위에 놓인 항목.
- 축 이름 누락.
- 축 라벨과 모서리 태그가 다른 용어를 쓰는 방식.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 420">
  <rect width="520" height="420" fill="#f8fafc"/>
  <path d="M260 60 V340 M100 200 H420" stroke="#1e3a5f" stroke-width="1.5"/>
  <text x="260" y="42" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="11" fill="#6b7280">효과</text>
  <text x="438" y="205" font-family="Pretendard, Arial, sans-serif" font-size="11" fill="#6b7280">실행성</text>
  <circle cx="342" cy="132" r="5" fill="#2c8d8a"/><circle cx="184" cy="150" r="4" fill="#6b7280"/><circle cx="328" cy="268" r="4" fill="#6b7280"/>
  <text x="354" y="136" font-family="Pretendard, Arial, sans-serif" font-size="13" font-weight="700" fill="#1e3a5f">우선 구축</text>
  <text x="196" y="154" font-family="Pretendard, Arial, sans-serif" font-size="12" fill="#0f172a">후보 A</text>
  <text x="340" y="272" font-family="Pretendard, Arial, sans-serif" font-size="12" fill="#0f172a">후보 B</text>
</svg>
```
