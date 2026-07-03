# 메시 로그 판독 (mesh-log)

> 보드 공통 — 메시(ESP-NOW) 텍스트 로그의 태그·필드를 판정으로 치환하는 가드레일.
> **출처**: 4개 펌웨어 공통 `sendMessage` 계약 소스 분석 + 실장비 검증(serial-mcp-server `docs/plans/2026-07-03-chain-cidx-ident-jump-needle.md`).
> 필드를 잘못 읽으면 "수신 성공 / 링크 품질 / 동일 메시지"를 전부 오판한다 — 메시 로그를 해석하기 전에 이 표 먼저.

## 판독 치환표 — 단정 금지 → 지정 경로

| 로그에 보이는 것 | 이렇게 단정 금지 | 대신 이렇게 판정 |
|---|---|---|
| `[WiFi_Rx]` 라인 | "상대가 보낸 것을 수신했다" | dedup 전 출력이라 **자기 송신 에코 포함** — 도착·성공 판정은 `get_topology` recent_chains 의 `ok`·`confidence` 로만 |
| INFO 배열의 RSSI 숫자 | "이 링크의 품질" | **이웃 평균 RSSI** 다 — 링크별 품질은 `[Route] Link A -> B rssi=` 라인만 |
| 두 포트에 같은 `Unique` | "같은 메시지" | 1..99 **롤링 재사용** — (UnID,Unique) 둘 다 + 시각 근접까지 일치할 때만 동일 취급. 하행 요청(REQRSSI 등)에도 실리므로 "상행 전용"도 아니다 |
| 두 포트에 같은 `Cidx` | "같은 메시지" | **장비별 독립 송신 카운터** — 나머지 payload 필드(UnID·Asn 등)까지 같을 때만 동일 취급 |
| 송신 라인(`[Tx...]`·`[Proc_WiFiTx]`)에 `Cidx` 없음 | "송신 실패" / "수신측과 다른 메시지" | **정상** — Cidx/Rev 는 전파 직전 부착이라 송신 콘솔엔 원래 없다. 수신 라인과의 대조는 나머지 payload 로 |
| `Rev:true` | "수신 확인(ACK) 표시" | 비-SSM 장비 송신에 자동 부착되는 마커일 뿐(SSM 송신엔 없음) — 응답 여부는 chains 의 `ok` 로 |
| `UnID` 값 | "항상 발신자" | 방향에 따라 발신자/대상 — 단독 해석 금지, chains 노드의 src/dst 역할로 |
| `[Data_Pass]` 라인 | "리피터가 자기 메시지를 송신" | **중계**(bypass — 원문 무변형 재전송)다. 원 발신자는 payload 의 UnID/Mac |
| BayID=0 장비의 메시지 | "UnID 로 추적" | UnID 대신 **Mac** 이 실린다 — Mac 으로 추적 |
| 홉·체인의 나열 순서 | "시간 순서·인과" | 순서≠시각(도구 응답의 `hops_caveat` 동일 경고) — 경로 순서는 `ordered=true` 인 체인만 신뢰 |

## 조회 순서

멀티홉 도착·경로·성공 판단은 단일 포트 원문이 아니라 `get_topology`(로스터+recent_hops+recent_chains) 먼저. 원문 확인은 그 다음 `get_recent_logs`/`query_serial_logs` 로 좁힌다. 이 표와 도구로 판정이 안 되면 추측하지 말고 관측을 더 모으거나 사람에게 확인한다.
