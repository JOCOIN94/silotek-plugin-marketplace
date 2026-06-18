# SSM atlas extract

> SSM 게이트웨이(ESP32-S3) 운용 증류본. **출처**: `atlas/ssm/SSM260525-004.yaml`, `notes-config-model.md`, `notes-log-vocabulary.md`, `notes-reset-triggers.md`, `notes-comm-health.md`, `exploration/2026-06-13-nocompany-truth-source`.
> 전체 명령 사전·`source_ref`는 atlas YAML이 단일 진실원이다. 다만 atlas는 plugin payload 밖의 원천 자료이므로, 정상 runtime 작업 중에는 이 extract에 없는 명령을 임의로 실행하지 않는다 — 필요한 명령이 extract에 없으면 atlas 보강·skill 재증류 대상으로 보고하고 멈춘다.
> 운용 절차(루프·승인·interactive prompt·redaction·검증)는 `serial` 스킬 `references/ops.md`.

## Board identity

- Device: **SSM** (게이트웨이, ESP32-S3). Firmware basis: **SSM260525-004**. Source: `ssm-esp32@178e29f7`.
- 상태: **source-only — 배포 장비 미실측(observed 0/70).** version_skew: 배포 장비 버전 미검증.
- **배포 장비 확인(R1/R2 조작 전)**: `FWVER`로 버전(`FW Ver:SSM260525-004`), `HELP`로 명령 목록을 본다.

## 의도 → 명령 (command selection)

| 사용자 의도 | 명령 | risk |
|---|---|---|
| WiFi/라우터/소켓 **상태** 조회 | `STWIFI`, `VROUTERRSSI` | R0 |
| **SSID·비밀번호·네트워크 credential 변경** | `SETCONFIG` | R2 |
| WiFi **송신출력(TX power)** 변경 | `SETWIFI` | R1 |
| 펌웨어 버전 | `FWVER` | R0 |
| 하위장비 통신 상태 | `INFO`, `STCOMM` | R0 |
| 통신 점검(횟수 지정) 시작 | `REQSTCOMM` | R1 |
| bay 설정(NoCompany·요금 등) | `SETBAYCONFIG` | R1 (상위 web sync가 덮어쓸 수 있음 — 아래) |
| SSM 재부팅 | `RESET` | R2 |
| AP 모드 진입(+재부팅) | `APMODE` | R2 |
| 등록 MAC 편집 | `SETREGMAC` | R1 |
| SSM ID/authCode 편집 | `SETSSMID` | R1 |

**critical confusion — `SETWIFI` ≠ credential 변경.** `SETWIFI`는 WiFi 송신출력(TX power)만 바꾼다(R1; `WiFi.setTxPower()`). SSID·비밀번호·네트워크 설정은 `SETCONFIG`(R2)다. "와이파이 바꿔줘"가 접속 대상(SSID/비밀번호) 변경이면 `SETCONFIG`다.

## risk별 명령 (주요 명령 — 전체 사전은 atlas YAML, 게이트 절차는 ops.md)

- **R0 (조회 — 바로 실행 가능)**: `FWVER` `STWIFI` `VROUTERRSSI` `INFO` `STCOMM` · `HELP`/`MHELP`/`HHELP`/`THELP`. `VSSMID`는 R0-sensitive(아래). 그 외 상태를 바꾸지 않는 조회·view 명령(`VRSSI`·`TINFO`·`VTIME`·`VRTC`·`VFILELST`·`CMPMEM`·`VUPDATE`·`MAC`·`GID`·`UNITID`·`CHANNEL` 등)도 R0.
- **R1 (저위험·복원 가능 변경 — snapshot·verify)**: `SETWIFI`(TX power, credential 아님) `SETBAYCONFIG` `SETSSMID`(authCode) `SETREGMAC` `SETRTCTIME` `REQSTCOMM`. 그 외 복원 가능한 표시 toggle·버퍼 정리류(`VEXTUNITINFO`·`VRXALLPKTS`·`VREVBUFF`·`CREQINFO`·`CLRINFO`·`CLRCURSSID`·`CHKMEM`·`SERIAL`·`SKIPDOWNLOAD`·`AUTOTEST`·`CLRAUTOTEST`·`REQDNFWVER` 등)도 R1.
- **R2 (재부팅·재연결·영구 변경 — 사람 입회+검증)**: `SETCONFIG`(성공 시 reboot) `RESET` `APMODE` `TXBINTEST`(하위장비로 바이너리 송신)
- **R3 (파괴·임의 주입 — 실행 금지)**: `REFLASH` `REFLASHESP` `ALLREFLASH` `DOWNBIN` `CDOWNBIN` `DOWNBINWEB` `REMFILE` `FORMAT` `KSFFORMAT` `WFORMAT` · `VIRWEBCMD`(임의 Web JSON 주입) `BYPASSCMD`(임의 ESP-NOW JSON 주입) · boot-menu `D`(다운로드/리플래시)

## interactive 명령 (블로킹 서브 상태 — 처리법은 ops.md)

prompt가 있는 명령은 입력을 기다리는 블로킹 상태에 진입한다. 통째 multiline 금지, prompt마다 응답, 예상과 다르면 중단.

- **`SETCONFIG`** — R2, core config(SSID/passwd/네트워크 포함). 성공(`setConfig()==0`) 시 socketIO 끊고 1500ms 뒤 `ESP.restart()`. secrets: `passwd`, `testpasswd`. 검증: boot 완료 + `STWIFI`/`VROUTERRSSI`.
  - ⚠ **정확한 prompt 필드 순서는 atlas에 미확정(source-only)** — `setConfig()` 소스/실측으로 확인하기 전엔 필드 순서를 추측해 자동으로 밀어넣지 마라. prompt를 관측하며 한 단계씩 진행한다.
- **`SETBAYCONFIG`** — R1, bay config(NoCompany·요금·마스터카드 등). 변경 감지 시 `saveBayConfig()` 후 하위장비에 `ReqCBayToSSM="ALL"` 브로드캐스트. 즉시 reboot 없음.
- **`SETSSMID`** — R1, SSM ID/`authCode` 편집(`/Security.txt`). secret: `authCode`.
- **`SETREGMAC`** — R1, 등록 하위장비 MAC 버퍼 편집.
- **`SETRTCTIME`** — R1, RTC를 year/month/day/hour/minute/second 6개 값으로 설정.
- **`REQSTCOMM`** — R1, "점검 횟수(0..255), Q=종료, blank=1" prompt. inspection/fault-check/OTA 활성 시 차단.
- **`SETWIFI`** — R1, WiFi power table 출력 후 숫자 TX power 1개(예: 84,82,...,-4). credential 변경 아님.
- **boot-menu**(리셋 직후 setup 창의 단일 키): `S`=SETCONFIG 후 성공 시 재부팅(R2), `B`=SETBAYCONFIG(R1), `I`=SETSSMID 후 성공 시 재부팅(R2), `R`=재부팅(R2), `D`=다운로드/리플래시(R3).

## R0-sensitive

`VSSMID`는 상태를 바꾸지 않는 R0이지만 `authCode`(secret)를 출력한다. 사용자가 SSM ID/authCode 상태를 특정해 요청할 때만 사용하고, 출력·요약·로그의 secret 값은 가린다(redaction은 secrets 섹션 참조). R0이라고 무조건 가볍게 실행하지 않는다.

## secrets (redaction)

`passwd`, `testpasswd`(WiFi credentials), `authCode`(SSM ID, `/Security.txt`). 이 값들은 송신 명령·회수 로그·요약 어디에도 평문으로 남기지 않는다. `VSSMID`는 `authCode`를 출력하므로 그 출력도 가린다.

## verification signatures

- **boot 완료**(재부팅·리셋 후 필수, 둘 다): `FW Ver:SSM260525-004` + `>>> Setup completed <<<`. 배너만 있고 완료가 없으면 AP모드·파일시스템·OTA 등 setup 블로킹 중일 수 있다.
- **WiFi/네트워크 상태**: `STWIFI` 출력(WiFi country, TX power, 모듈 RSSI, 현재 SSID 연결상태, `fConnectSocket`, `socketIO.isConnected()`), `VROUTERRSSI`(현재 연결 SSID + RSSI).
- **하위장비 통신**: `INFO` 테이블의 `ComRate(Rev/Req)`, `STCOMM`의 `Communication state by unit`(각 유닛 `Good`/`Bad`/`Checking`; 20+ 사이클 후 확정).
- **reset 분류**: `WEB ORDER_RESET - SSM`/`WEB ORDER_APMODE - SSM`(웹 명령), `Reboot due to consecutive negative response`(HTTP 누적 실패), `Failed to initialize ESP-NOW`/`Failed to initialize broadcast peer`(부팅 ESP-NOW 실패), `Reflash was a success.`+`Reboot...`(리플래시 후). 최종 리셋 로그만으로 원인 단정 금지 — 앞선 로그에서 `fReset` 설정자를 찾는다.
- **config 저장/식별**: `cfg saved`/`Baycfg saved`(로더가 누락·무효 필드 재기록), `authCode : Not Registered`(Security.txt에 authCode 없음 → `setSSMID()` 진입 가능).

## 로컬 bay 설정 ≠ 영속 (상위 web truth-source)

로컬 `SETBAYCONFIG`가 `NoCompany` 등을 성공적으로 써도, 상위 web `/bayConfig` 응답이 재부팅·sync 때 `/Bayconfig.txt`를 덮어쓸 수 있다. 따라서:

- 로컬 한 번 쓰고 "고쳤다" 금지. **재부팅/sync 후 3계층** 확인: ① SSM `CBay[3]`/`bayConfigs.NoCompany` ② SB-ESP가 SSM `CBay[...]`를 받아 `/Bayconfig.txt` 기록 ③ STM `Reved BayConfig Info`의 `NoCompany:<값>`.
- 상위가 로컬을 덮어쓰는 패턴이면 "상위 web/backend 설정" 문제로 분류·보고하고 멈춘다. 비즈니스 web/DB를 직접 고치지 말고, 운영자에게 승인된 web 경로로 변경을 요청한다. (전체 triage 출처: `atlas/ssm/exploration/2026-06-13-nocompany-truth-source/summary.md`.)
