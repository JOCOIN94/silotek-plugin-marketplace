---
name: ssm
description: SSM 게이트웨이 보드(ESP32-S3)를 serial-mcp로 다룰 때 쓴다 — SSM 로그·상태, WiFi/라우터/소켓 상태(STWIFI·VROUTERRSSI), SSID·비밀번호(credential)·네트워크 설정(SETCONFIG), WiFi 송신출력(SETWIFI), 재부팅·AP모드(RESET·APMODE), 펌웨어 버전·명령 목록(FWVER·HELP), 하위장비 통신(INFO·STCOMM·REQSTCOMM), bay 설정(SETBAYCONFIG·NoCompany), configuration 검증. 호스트 PC의 WiFi/네트워크 설정에는 쓰지 않는다.
---

# SSM 게이트웨이 (serial-mcp)

SSM은 사일로텍 게이트웨이(ESP32-S3)다. 이 스킬은 SSM **명령의 의미·risk·검증 시그니처**를 담는다. *어떻게* 관찰·조작·검증하는지(표준 루프·승인 게이트·interactive prompt 처리·secret redaction 등)는 `serial` 스킬의 `references/ops.md`를 따른다.

- 작업 전 **`references/atlas-extract.md`를 읽어라** — 의도→명령 매핑, 명령별 risk, secret, 검증 로그가 거기 있다.
- SSM atlas는 **소스 기반(배포 장비 미실측 — observed 0/70)**이다. R1/R2 조작 전 `FWVER`·`HELP`로 배포 장비가 atlas 기준과 맞는지 먼저 확인한다.

## 자주 혼동되는 것

- **WiFi/SSID/비밀번호 변경 = `SETCONFIG`** (interactive core config, R2). **`SETWIFI`가 아니다** — `SETWIFI`는 WiFi 송신출력(TX power)만 바꾼다(R1).
- WiFi/라우터 **상태 조회**는 `STWIFI`·`VROUTERRSSI`(R0)다 — 변경 명령을 쓰지 마라.
- 호스트 PC의 WiFi/네트워크 설정은 이 스킬 범위 밖이다.
