# ER / 데이터 모델 (ER / Data Model)

**적합한 곳:** 데이터베이스 스키마, API 리소스 관계, 도메인 모델.

## 레이아웃 규칙

- 각 엔티티는 헤더와 본문이 있는 박스다.
- 헤더에는 엔티티 이름, 본문에는 필드 목록을 한 줄에 하나씩 둔다. PK는 `PK`, FK는 `FK`처럼 짧게 표기한다.
- 관계는 엔티티 사이를 잇는 선이고, 양 끝에 `1`, `N`, `0..1`, `1..*` 같은 카디널리티를 배치한다.
- 선택적으로 관계 라벨(`has`, `belongs to`)을 선 가운데에 둔다.
- 관련 엔티티를 가까이 모으고, 대부분의 관계가 직선 또는 짧은 elbow가 되도록 배치한다.
- teal은 애그리거트 루트 또는 중심 엔티티 하나에 쓴다.
- 필드가 많으면 핵심 필드만 보이고, 나머지는 `...` 라벨로 묶는다. 근거 항목이 필요로 하는 필드는 빼지 않는다.

## 안티패턴

- FK가 많은 모델에서 모든 FK마다 긴 화살표를 반복하는 방식. 클러스터로 배치한다.
- 같은 관계 양 끝의 카디널리티가 일관되지 않음.
- 내용과 무관하게 엔티티 높이를 억지로 맞춤.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 260">
  <rect width="620" height="260" fill="#f8fafc"/>
  <rect x="64" y="52" width="180" height="132" rx="8" fill="#ffffff" stroke="#2c8d8a" stroke-width="2"/>
  <rect x="64" y="52" width="180" height="36" rx="8" fill="#e8f5f5" stroke="#2c8d8a"/>
  <rect x="376" y="52" width="180" height="132" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="376" y="52" width="180" height="36" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <path d="M244 118 H376" stroke="#1e3a5f" stroke-width="2"/>
  <text x="154" y="76" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="14" font-weight="700" fill="#1e3a5f">Project</text>
  <text x="88" y="112" font-family="Pretendard, Arial, sans-serif" font-size="12" fill="#0f172a">PK id</text>
  <text x="88" y="134" font-family="Pretendard, Arial, sans-serif" font-size="12" fill="#0f172a">name</text>
  <text x="466" y="76" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="14" fill="#0f172a">Task</text>
</svg>
```
