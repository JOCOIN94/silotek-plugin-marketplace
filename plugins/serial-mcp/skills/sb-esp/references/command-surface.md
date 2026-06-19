# SB-ESP command surface

> SmartBay ESP32(SB260610-001) 운용 증류본. **출처**: `atlas/sb-esp/SB260610-001.yaml`, `notes-source-analysis.md`, `exploration/2026-06-12-r0`.
> 전체 명령 사전·`source_ref`는 atlas YAML이 단일 진실원이다. 다만 atlas는 plugin payload 밖의 원천 자료이므로, 정상 runtime 작업 중에는 이 command surface에 없는 명령을 임의로 실행하지 않는다 — 필요하면 atlas 보강·skill 재증류 대상으로 보고하고 멈춘다.
> 운용 절차(루프·승인·interactive prompt·redaction·검증)는 `serial` 스킬 `references/ops.md`.

## Board identity

- Device: **SB-ESP** (SmartBay ESP32, 통신·WiFi, STM32와 짝). Firmware basis: **SB260610-001**. Source: `SB-SmartBay@0b01761`.
- 상태: **실측 일부 검증** — runtime HELP 34개 목록·`FWVER`·`GID`·`UNITID`·`MAC`·`CHANNEL`·`VFILELST` observed. version_skew: 배포 빌드 **SB260526-002**(소스 HEAD SB260610-001); HELP 34개는 HEAD와 동일 확인.
- 일부 명령(`COIN`·`OPERFUNCT`·`MGWANGCHA`)은 짝 STM32(SB-STM)로 명령을 전달한다.

## command surface — help는 상태에 따라 다르다

- **runtime-serial HELP(34개)** ≠ **AP-mode/telnet short HELP(3개: `RESET`, `REFLASHSTM`, `REFLASHESP`)**. AP/telnet에는 별도 `MHELP`(확장)가 있다. 어느 surface인지 확인하고 명령을 고른다.
- **boot-menu(`D`/`S`/`B`/`R`)는 리셋 직후 setup 창의 단일 키 입력**이며, normal runtime text 명령으로 가정하지 않는다.

## 의도 → 명령 (command selection)

| 의도 | 명령 | risk |
|---|---|---|
| WiFi country/TX power 상태 | `STWIFI` | R0 |
| WiFi 송신출력(TX power) 변경 | `SETWIFI` | R1 |
| 펌웨어 버전(ESP+STM) | `FWVER` | R0 |
| 식별(group/unit/MAC/channel) | `GID`·`UNITID`·`MAC`·`CHANNEL` | R0 |
| 코어 설정(AP SSID/GID/Channel/UnitID/Rfgain/SSID) | `SETCONFIG` | R2 |
| bay 설정(요금·Number of Company 등) | `SETBAYCONFIG` | R1 |
| 등록 MAC 편집 | `SETREGMAC` | R1 |
| 카드 키/오프셋 | `SETCARDINFO` | R1 |
| STM에 코인/기능/관리모드 전달 | `COIN`·`OPERFUNCT`·`MGWANGCHA` | R1 |
| 파일 목록/내용 | `VFILELST`·`VFILE` | R0 |
| 재부팅 / AP모드 | `RESET` / `APMODE` | R2 |

## critical confusions

- **`SETWIFI` ≠ credential 변경.** `SETWIFI`는 WiFi TX power(송신출력)만 바꾼다(R1; `WiFi.setTxPower()`). SSID 등 코어 설정은 `SETCONFIG`(R2; AP SSID·SSID 스텝 포함).
- runtime HELP surface와 AP/telnet HELP surface가 다르다(위).
- `OPERFUNCT`는 SB-ESP에서 STM32로 기능 명령을 전달한다 — 같은 이름이라도 SB-STM 콘솔의 `OPERFUNCT`(자체 동작)와 실행 위치가 다르다. command name만 보고 의미를 추정하지 마라.

## risk별 명령 (주요; 전체는 atlas YAML)

- **R0 (조회 — 바로 조회 가능)**: `STWIFI` `FWVER` `GID` `UNITID` `MAC` `CHANNEL` `VRSSI` `REGMAC` `VFILELST` `VFILE` `DUMPFILE` `VAL` `VRTC` `CMPMEM` `SHOWPROC` `VSAVEEVENTCNT`
- **R1 (저위험·복원 가능 변경 — snapshot·verify)**: `SETWIFI`(TX power) `SETBAYCONFIG` `SETREGMAC` `SETCARDINFO` `SETRTCTIME` `COIN` `OPERFUNCT` `MGWANGCHA` · 표시/감시 toggle류(`VEXTUNITINFO`·`CHKMEM`·`ALIVE`·`VREVBUFF`·`SERIAL`·`PRINTSENDPROC`) · boot-menu `B`(SETBAYCONFIG)
- **R2 (재부팅·재연결·코어 설정 — 승인·입회 없이 자동 실행+검증)**: `RESET` `APMODE` `SETCONFIG`(변경 시 restart) · boot-menu `S`(SETCONFIG) `R`(reset)
- **R3 (파괴·실행 금지)**: `DOWNBIN` `CDOWNBIN` `REMFILE` `FORMAT` `WFORMAT` `REFLASHESP` `REFLASHSTM` · boot-menu `D`(다운로드/리플래시). firmware/file destructive — 자동 실행 금지.

## interactive 명령 (prompt dialogue — 처리법은 ops.md)

prompt가 있는 명령은 통째 multiline 금지, prompt마다 응답, 예상과 다르면 중단. 이 보드의 config 마법사는 atlas에 **blank=현재값 유지, nonblank는 Y/N 확인, Q=종료**로 문서화돼 있다.

- `SETCONFIG` — R2. AP SSID → GID → WiFi Channel → UnitID → RFID Rfgain → SSID 순. 변경값 저장 시 `saveConfig()` 후 `ESP.restart()`. 검증: boot 재기동 + `FWVER`/`STWIFI`.
- `SETBAYCONFIG` — R1. EndTime/Price/Number of Company/MasterCard 등. 저장 후 `Send_configBay()`로 STM32에 전송.
- `SETREGMAC` — R1. MAC 추가, V(조회)/C(삭제)/Q, side 0/1, Y/N 확인.
- `SETCARDINFO` — R1. KeyA/KeyB(hex 6바이트)·card point offset.
- `SETRTCTIME` — R1. year/month/day/hour/minute/second 6개 값.
- `COIN` — R1. 0~255 입력 시 STM에 coin 전송; **빈 줄은 1코인 충전**(이 명령은 blank에 의미가 있다고 atlas가 문서화).
- 파일 선택형(`REMFILE`/`VFILE`/`DOWNBIN`/`CDOWNBIN`/`DUMPFILE`)도 prompt dialogue다.

## verification signatures

- 명령 echo가 수신 증거다(실측: 명령 echo 후 값 출력 — `GID`→`199`, `MAC`→`30,AE,A4,...`, `CHANNEL`→`11`).
- `FWVER`: `ESP32 FW Ver. : <ver>, STM32 FW Ver. : <ver>`.
- `STWIFI`: WiFi country + TX power.
- `VFILELST`: `File system's total space: ... Used space : ...` + 파일 목록.
- 재부팅(`RESET`/`APMODE`/`SETCONFIG` 변경) 후: boot 로그 재기동 + `FWVER` 재확인. **명령 전송 성공 ≠ 동작 성공** — echo·fresh log·status·reboot/reconnect로 검증한다.

## 보드 특유 주의

- firmware/format 계열(R3)은 자동 실행 금지 — 보드별 절차·복구 경로·정확한 대상 확인·명시 승인 없이 진행하지 않는다.
- AP/telnet vs runtime surface를 먼저 확인하고, boot-menu 키는 setup 창에서만 유효하다.
- STM32로 명령을 전달하는 R1(`COIN`/`OPERFUNCT`/`MGWANGCHA`)은 하위 STM 동작까지 검증 대상이다.
