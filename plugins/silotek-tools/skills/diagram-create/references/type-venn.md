# 벤 / 집합 겹침 (Venn / Set Overlap)

**적합한 곳:** 개념/도메인의 교집합, 범주 간 공유 속성, "A와 B가 만나는 곳", 이키가이 스타일 프레임.

## 레이아웃 규칙

- 원 2~3개를 편집형 기본값으로 삼는다. 더 많은 집합이 필요하면 매트릭스도 고려하되, 브리프가 벤을 요구하면 가독성을 먼저 확인한다.
- 원 선은 1px 헤어라인이고, 집합별 색은 명확히 구별한다.
- 원 채움은 낮은 불투명도 틴트로 둔다. 겹치는 영역이 자연스럽게 합쳐지게 한다.
- 반지름은 집합 크기가 비슷하면 같게, 의미 있게 다르면 비례하게 둔다.
- 집합 라벨은 원 바깥에 두고 선을 가로지르지 않게 한다.
- 교집합 라벨은 겹치는 영역 안에 가운데 정렬한다. 작은 겹침에는 빈 곳의 라벨로 가는 리더선을 쓴다.
- teal은 초점 교집합 하나에 쓴다.
- 원 중심과 반지름은 4로 나누어떨어지게 둔다.

## 안티패턴

- 라벨 없는 영역.
- 겹침이 요점인데 겹치지 않는 원들.
- 집합 크기가 명백히 다른데 같은 크기 원을 쓰는 방식.
- 여러 겹침 영역에 같은 강조를 주는 방식.
- 원 선 위에 놓인 라벨.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 340">
  <rect width="560" height="340" fill="#f8fafc"/>
  <circle cx="236" cy="172" r="108" fill="#2563eb" opacity="0.10" stroke="#2563eb"/>
  <circle cx="324" cy="172" r="108" fill="#16a34a" opacity="0.10" stroke="#16a34a"/>
  <circle cx="280" cy="236" r="108" fill="#2c8d8a" opacity="0.10" stroke="#2c8d8a"/>
  <text x="184" y="82" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">필요성</text>
  <text x="376" y="82" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">실행성</text>
  <text x="280" y="322" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">지속성</text>
  <text x="280" y="190" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="15" font-weight="700" fill="#1e3a5f">착수 영역</text>
</svg>
```
