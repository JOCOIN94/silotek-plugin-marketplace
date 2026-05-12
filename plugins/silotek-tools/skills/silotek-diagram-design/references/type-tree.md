# 트리 / 위계 (Tree / Hierarchy)

**적합한 곳:** 조직도, 의존성 트리, 분류 체계, 파일 트리, 결정 분해, 스킬 트리.

## 레이아웃 규칙

- 루트는 위, 자식은 아래로 펼치거나, 루트는 왼쪽, 자식은 오른쪽으로 펼친다.
- 노드는 작은 라벨 사각형(`rx=6`)이다. 이름과 선택적 서브라벨만 둔다.
- 연결선은 직교 elbow 스타일이다. 부모가 짧은 수직선을 내리고, 가로 bus가 형제들을 잇고, 각 자식이 자기 상단 가장자리로 짧은 수직 낙하를 받는다.
- 편집형 기본값은 루트 포함 깊이 4단 안팎, 레벨당 폭 5개 안팎이다. 브리프 근거가 더 많으면 서브트리 타일이나 접힌 그룹 노드로 읽히게 한다.
- leaf는 더 가는 선이나 말단 위치로 구분한다.
- teal은 루트 또는 결정적 leaf 하나에만 쓴다.
- 노드보다 연결선을 먼저 그린다.

## 안티패턴

- 읽을 수 없을 만큼 깊은 트리를 한 페이지에 밀어 넣는 방식.
- 너비가 제멋대로인 노드. 너비는 1~2종만 둔다.
- 대각선 연결선.
- 건너뛴 레벨.
- 루트와 leaf 둘 다에 같은 강조를 주는 방식.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 320">
  <rect width="620" height="320" fill="#f8fafc"/>
  <path d="M310 92 V132 H154 V168 M310 132 H310 V168 M310 132 H466 V168" fill="none" stroke="#1e3a5f" stroke-width="1.5"/>
  <rect x="230" y="44" width="160" height="48" rx="6" fill="#e8f5f5" stroke="#2c8d8a" stroke-width="2"/>
  <rect x="82" y="168" width="144" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="238" y="168" width="144" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="394" y="168" width="144" height="48" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="310" y="73" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="14" font-weight="700" fill="#1e3a5f">도구</text>
  <text x="154" y="198" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">YAML</text>
  <text x="310" y="198" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">DOCX</text>
  <text x="466" y="198" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="13" fill="#0f172a">Diagram</text>
</svg>
```
