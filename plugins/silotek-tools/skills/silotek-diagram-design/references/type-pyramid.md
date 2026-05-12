# 피라미드 / 퍼널 (Pyramid / Funnel)

**적합한 곳:** 욕구 위계, 우선순위 등급, 가치 피라미드, 전환 퍼널, 콘텐츠 중요도 스택.

## 두 방향

- 피라미드는 위로 뾰족하다. 좁은 꼭대기는 가장 중요하거나 가장 희소하거나 가장 가치 있음을 뜻한다.
- 퍼널은 아래로 뾰족하다. 좁은 끝은 전환 또는 남은 그룹을 뜻한다.
- 한 다이어그램에서 방향을 섞지 않는다.

## 레이아웃 규칙

- 레이어 4~6개 안팎을 편집형 기본값으로 삼는다. 브리프 근거가 더 많으면 상위/하위 그룹으로 묶거나 두 장 분할을 보고한다.
- 각 레이어는 점 4개로 만든 SVG `<polygon>` 사다리꼴이다.
- 레이어 높이는 일관되게 둔다.
- 너비는 바닥->꼭대기 또는 위->아래로 선형으로 줄어든다. 실제 퍼널 데이터를 보일 때 너비는 개수나 퍼센트에 비례해야 한다.
- 각 레이어는 이름 라벨과 선택적 서브라벨을 담는다.
- 측면 주석은 필요한 경우에만 둔다.
- teal은 꼭대기, 전환 레이어, 결정적 병목 중 하나에만 쓴다.

## 안티패턴

- 위계적이지 않은 데이터에 피라미드를 쓰는 방식.
- 부정직한 너비.
- 바닥 레이어와 꼭대기 레이어를 동시에 강조하는 방식.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 360">
  <rect width="560" height="360" fill="#f8fafc"/>
  <polygon points="216,56 344,56 376,116 184,116" fill="#e8f5f5" stroke="#2c8d8a" stroke-width="2"/>
  <polygon points="184,124 376,124 416,188 144,188" fill="#ffffff" stroke="#cbd5e1"/>
  <polygon points="144,196 416,196 456,260 104,260" fill="#ffffff" stroke="#cbd5e1"/>
  <polygon points="104,268 456,268 500,328 60,328" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="280" y="91" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="14" font-weight="700" fill="#1e3a5f">핵심 판단</text>
  <text x="280" y="160" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">검증</text>
  <text x="280" y="232" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">구현</text>
  <text x="280" y="304" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">근거 수집</text>
</svg>
```
