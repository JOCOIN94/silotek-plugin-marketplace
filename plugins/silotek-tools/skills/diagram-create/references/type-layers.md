# 레이어 스택 (Layer Stack)

**적합한 곳:** OSI 모델, CSS 캐스케이드, 컨텍스트 위계, 기술 스택, 추상화 계층, 메모리 계층.

## 레이아웃 규칙

- 수평 띠를 세로로 쌓는다. 각 레이어는 같은 x와 같은 너비를 가진다.
- 편집형 기본값은 레이어 4~6개 안팎이다. 브리프 근거가 더 많으면 레이어를 그룹으로 묶거나 서브라벨을 축약한다.
- 레이어 높이는 56~72px를 기본으로 한다.
- 각 행은 좌측 인덱스 태그, 레이어 이름, 우측 서브라벨 또는 노트로 구성한다.
- 레이어 사이 경계는 1px 헤어라인이다.
- 방향 표시는 왼쪽 여백 바깥에 둔다.
- teal은 초점 레이어 하나에만 쓴다.

## 안티패턴

- 실제로 위계적이지 않은 데이터를 레이어로 표현하는 방식. 그런 경우 swimlane이나 architecture를 쓴다.
- 번호 건너뜀.
- 레이어마다 다른 색을 주는 방식.
- 이유 없이 일관되지 않은 레이어 높이.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 340">
  <rect width="640" height="340" fill="#f8fafc"/>
  <rect x="96" y="52" width="448" height="56" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="96" y="116" width="448" height="56" rx="6" fill="#e8f5f5" stroke="#2c8d8a" stroke-width="2"/>
  <rect x="96" y="180" width="448" height="56" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="96" y="244" width="448" height="56" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="120" y="86" font-family="Pretendard, Arial, sans-serif" font-size="11" fill="#6b7280">L4</text><text x="180" y="86" font-family="Pretendard, Arial, sans-serif" font-size="14" fill="#0f172a">UI</text>
  <text x="120" y="150" font-family="Pretendard, Arial, sans-serif" font-size="11" fill="#2c8d8a">L3</text><text x="180" y="150" font-family="Pretendard, Arial, sans-serif" font-size="14" font-weight="700" fill="#1e3a5f">Agent</text>
  <text x="180" y="214" font-family="Pretendard, Arial, sans-serif" font-size="14" fill="#0f172a">Scripts</text>
  <text x="180" y="278" font-family="Pretendard, Arial, sans-serif" font-size="14" fill="#0f172a">Storage</text>
</svg>
```
