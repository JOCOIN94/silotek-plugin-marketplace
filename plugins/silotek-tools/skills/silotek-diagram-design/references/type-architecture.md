# 아키텍처 (Architecture)

**적합한 곳:** 시스템 개요, 데이터 흐름도, 통합 맵, 인프라 토폴로지.

## 레이아웃 규칙

- 컴포넌트를 계층이나 신뢰 경계로 묶는다(frontend -> backend -> data, public -> private).
- 주 흐름은 좌->우 또는 위->아래 중 하나를 고르고 끝까지 유지한다.
- 연결선은 박스보다 먼저 배치해 z-order상 컴포넌트 뒤로 가게 한다.
- focal node는 1~2개만 둔다. 주 통합 지점, 주 데이터 저장소, 핵심 결정 노드가 후보이다.
- 편집형 기본값은 주요 박스 9개 안팎이다. 브리프 근거가 더 많으면 영역, 서브박스, 타일로 묶어 읽히게 한다.
- 점선 경계 사각형으로 영역(VPC, 보안 그룹, 신뢰 존)을 표시하고, 라벨은 경계선 위에 paper 색 마스크를 깔고 그 위에 둔다.

## 안티패턴

- 모든 박스에 강조색을 주는 방식. 위계가 무너진다.
- 맥락상 방향이 명백한데 양방향 화살표.
- 다이어그램 영역 안에 떠 있는 범례.

## 예시

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220">
  <defs><marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#1e3a5f"/></marker></defs>
  <rect width="640" height="220" fill="#f8fafc"/>
  <rect x="36" y="48" width="156" height="80" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="242" y="48" width="156" height="80" rx="8" fill="#e8f5f5" stroke="#2c8d8a"/>
  <rect x="448" y="48" width="156" height="80" rx="8" fill="#ffffff" stroke="#1e3a5f"/>
  <path d="M192 88 H242 M398 88 H448" stroke="#1e3a5f" stroke-width="2" marker-end="url(#arrow)"/>
  <text x="114" y="94" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="15" fill="#0f172a">사용자</text>
  <text x="320" y="94" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="15" font-weight="700" fill="#1e3a5f">API</text>
  <text x="526" y="94" text-anchor="middle" font-family="Pretendard, Arial, sans-serif" font-size="15" fill="#0f172a">데이터</text>
</svg>
```
