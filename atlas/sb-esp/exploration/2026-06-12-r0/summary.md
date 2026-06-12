# SB-ESP R0 샘플링 세션 요약 (2026-06-12, COM14)

- **커버리지**: R0 표본 7종 — HELP(목록 34개), FWVER, MAC, GID, UNITID, CHANNEL, VFILELST. 전부 `matches_source: true`, 문자 유실 0회.
- **장비 버전**: SB260526-002 (소스 HEAD SB260610-001 — runtime HELP 명령 표면은 동일 확인).
- **교차 검증**: MAC·GID·UNITID·CHANNEL이 SSM 측 config·패킷 관측값과 전부 일치 — 게이트웨이↔베이 시스템 정합 확인.
- **관찰**: ESP는 이벤트 수신이라 문자 유실 없음(STM과 대조적). 에코 줄 앞 `.`들은 보드의 주기 틱 출력이 같은 줄에 붙은 것.
- **불일치**: 소스 주장 대비 동작 불일치 없음.
