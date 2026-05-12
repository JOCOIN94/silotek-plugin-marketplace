# 주석 콜아웃 (Annotation Callout)

편집적인 곁말에 쓴다. 주 다이어그램 문법과 경쟁하지 않으면서 디테일을 짚는 여백 메모다.

## 문법

```svg
<!-- 1. Muted gray text -->
<text x="904" y="36" fill="#6b7280" font-size="14"
      font-family="Pretendard, Arial, sans-serif" text-anchor="end">설정 없이 바로 추출</text>
<!-- 2. Dashed leader -->
<path d="M 820 44 Q 700 84 520 216" fill="none"
      stroke="#6b7280" stroke-width="1" stroke-dasharray="4,3" opacity="0.55"/>
<!-- 3. Landing dot -->
<circle cx="520" cy="216" r="2" fill="#6b7280"/>
```

## 규칙

- muted gray 색이 곁말임을 신호한다. 타이포그래피 변형이 아니라 색과 위치가 callout을 구분한다.
- 점선 경로(`stroke-dasharray="4,3"`)는 콜아웃 리더선을 실선인 주 흐름과 구분한다.
- 콜아웃은 여백에 둔다(우상단, 좌하단). 활성 다이어그램 영역 안에는 두지 않는다.
- 다이어그램당 콜아웃은 최대 2개. 더 늘리면 신호가 아니라 해설이 된다.

## 색

| 의도 | 텍스트 | 리더선 |
|---|---|---|
| 중립적 곁말 | gray `#6b7280` | gray `#6b7280`, opacity 0.55 |
| 초점 곁말 | teal `#2c8d8a` | teal `#2c8d8a`, opacity 0.65 |
| 3차 곁말 | line `#cbd5e1` | line `#cbd5e1`, opacity 0.75 |

## 안티패턴

- 실선 화살표 리더선. 흐름 화살표로 읽힌다.
- 타이포그래피 변형만으로 곁말을 구분하는 방식. 래스터 환경에서 안정적이지 않다.
- 주 화살표나 lifeline을 가로지르는 콜아웃. 깨끗한 여백으로 비켜 둔다.
- 다이어그램이 직접 라벨링해야 할 것을 콜아웃으로 라벨링. 라벨은 해당 요소 위에 둔다.
