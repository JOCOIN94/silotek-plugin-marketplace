# 중첩 포함 (Nested Containment)

**적합한 곳:** 포함을 통한 위계, 스코프 경계, CLAUDE.md 캐스케이드, 신뢰 존, 폴더 중첩, 영향 반경(blast radius).

## 레이아웃 규칙

- 바깥은 더 넓은 범위, 안쪽은 더 구체적인 범위를 뜻한다.
- 둥근 사각형(`rx=8`) 3~5개 안팎을 편집형 기본값으로 삼고, 브리프 근거가 더 많으면 ring을 넓히거나 그룹 라벨을 추가한다.
- 각 레벨은 좌상단에 짧은 eyebrow 라벨을 둔다. 라벨은 링의 상단 경계 위에 paper 색 마스크 사각형을 깔고 그 위에 둔다.
- 선 위계는 바깥에서 안쪽으로 옅은 gray -> navy -> teal 순서로 강해진다.
- 채움은 바깥에서 안쪽으로 불투명도가 올라간다.
- callout은 필요한 경우 1~2개만 쓰고 여백에 둔다.

## 안티패턴

- 정보가 안쪽으로 사라질 만큼 깊은 중첩.
- 레벨 간 패딩이 불규칙한 구조.
- 위계의 일부가 아닌 내용을 ring 안에 넣는 방식.
- 여러 레벨에 같은 강조를 주는 방식.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340">
  <rect width="560" height="340" fill="#f8fafc"/>
  <rect x="48" y="48" width="464" height="244" rx="10" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="96" y="92" width="368" height="164" rx="10" fill="#f8fafc" stroke="#1e3a5f"/>
  <rect x="156" y="136" width="248" height="84" rx="10" fill="#e8f5f5" stroke="#2c8d8a" stroke-width="2"/>
  <text x="68" y="56" font-family="Pretendard, Arial, sans-serif" font-size="11" fill="#6b7280">조직</text>
  <text x="116" y="100" font-family="Pretendard, Arial, sans-serif" font-size="11" fill="#6b7280">플러그인</text>
  <text x="176" y="145" font-family="Pretendard, Arial, sans-serif" font-size="11" fill="#2c8d8a">스킬</text>
  <text x="280" y="184" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="15" font-weight="700" fill="#1e3a5f">실행 규칙</text>
</svg>
```
