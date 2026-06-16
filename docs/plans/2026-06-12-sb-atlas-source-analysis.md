# 계획서: SB 보드 명령 아틀라스 — 소스 분석 (Codex 인계용)

> **이 문서는 자족적(self-contained) 맥락 캡슐이다.** 구현자는 대화 맥락 없이 이 문서와 레포만으로 작업을 완수할 수 있어야 한다. 설계 결정은 모두 확정됐다 — 재협의하지 말고, §7 실패 기준에 해당하면 중단하고 보고하라.

## 1. 목표

`C:\Users\User\projects\firmware-src\SB-SmartBay` 소스에서 두 보드(**SB-ESP32**, **SB-STM32**)의 시리얼 명령 인터페이스를 **전수 추출**해 아틀라스 YAML 2개 + 노트 2개를 작성한다. **장비 접근 불필요 — 소스만 읽는다. 어떤 시리얼 포트에도 연결하지 마라.**

## 2. 배경

- 아틀라스의 스키마·작성 규칙·위험 등급은 `C:\Users\User\projects\silotek-plugin-marketplace\atlas\README.md`가 계약이다 — **먼저 정독하라.**
- 이 작업은 "장비 지식 수집" 프로젝트의 1단계(소스 분석)다. 다음 단계(장비 샘플링 실측·스킬 증류)는 별도 작업자가 수행하므로, 이 작업의 산출물은 소스 분석만으로 완결되어야 한다.
- 분석 대상 레포는 **읽기 전용**이다. `SB-SmartBay` 아래 파일을 절대 수정하지 마라.
- 산출물 쓰기 위치는 `C:\Users\User\projects\silotek-plugin-marketplace\atlas\` 아래만이다. **git 커밋은 하지 마라** — 파일만 남기면 리뷰 후 분석자가 커밋한다.

## 3. 검증된 전제 (사전 진단 2026-06-12 — 시작점 좌표)

**sb-esp32/SB_ESP32.ino** (~15,500줄 모놀리스, 라인 번호는 클론 HEAD 기준 참고 좌표 — 실제 파일을 읽고 시작하라):
- `void serialCmd(String str)` L15013 — 명령 본체 디스패처. 여기의 분기 전체가 명령 전수다.
- HELP/`???` L15908 — 3개만 노출(RESET, REFLASHSTM, REFLASHESP). **숨은 명령 `MHELP`** L15913이 30개 노출: RESET, GID, UNITID, SETCONFIG, SETBAYCONFIG, REGMAC, SETREGMAC, MAC, VRSSI, FWVER, CHANNEL, COIN, APMODE, SHOWPROC, REMFILE, FORMAT, WFORMAT, VFILELST, VFILE, DOWNBIN, REFLASHSTM, REFLASHESP, STWIFI, SETWIFI, VEXTUNITINFO, SETRTCTIME, VRTC, ALIVE, VREVBUFF, SETCARDINFO
- 제2 파서 사이트 L16578 — **텔넷 채널** 추정(L14788에 "Execute the command ... on Telnet client" 문구, `libraries/ESP_Telnet` 사용). 시리얼 경로와 동작이 같은지 다른지 규명하라.
- 부팅 메뉴 `"Set up this unit"` L15684 — D/S/B/I/R 항목. 진입 조건(리셋 직후 창·타임아웃)과 각 항목의 프롬프트 시퀀스를 추출하라.
- FW 버전: `SB_ESP32.h:8` `#define FW_VERSION "SB260610-001"` → 파일명 `SB260610-001.yaml`.
- 같은 폴더의 `관리자 모드 활용.txt`는 버튼·카드 기반 오프라인 운영 지식 — 명령 아틀라스 범위 밖이므로 무시(언급만 notes에).

**smartBay/Core/Src/main.c** (~18,000줄+):
- HELP/`???` L18340 — 9개 노출: SETRFGAIN, RFIDTEST, TOUCH, INSERT, OPERFUNCT, VRGCNT, CLRRGCNT, VCFGINDOOR, VDISPRS485
- L18336 부근에 HELP 목록에 없는 토글(`VDISPRS485` 류)이 보이므로 **숨은 명령이 더 있을 가능성이 높다** — 같은 if-else 사다리 전체를 훑어 전수 추출하라.
- FW 버전: 소스 define/문자열에서 찾아라(커밋 메시지상 v2.19 계열). 못 찾으면 `UNKNOWN-2026-06-12.yaml` + notes에 사유.

**주의 (실측에서 확인된 사실)**: 배포 장비의 HELP 목록은 소스 HEAD와 다를 수 있다(버전 스큐). 너의 기준은 **클론 HEAD 소스**다. `source_ref`에 커밋 해시(`git -C C:\Users\User\projects\firmware-src\SB-SmartBay rev-parse HEAD`)를 기록하라.

## 4. 작업 내용

1. `atlas/sb-esp/SB260610-001.yaml` — serialCmd() 분기 전수 + 텔넷 파서 + 부팅 메뉴(D/S/B/I/R은 `boot_menu` 컨텍스트의 commands로, 상태는 `states`에). 명령마다 README 스키마의 전 필드: `syntax`(인자 파싱 코드 근거), `prompts`(대화형 시퀀스), `effect`(사실만), `risk`+`risk_reason`, `source_ref`(파일:라인), `context`. `observed: null`.
2. `atlas/sb-stm/<버전>.yaml` — main.c의 명령 파서 동일 처리.
3. `atlas/sb-esp/notes-source-analysis.md`, `atlas/sb-stm/notes-source-analysis.md` — 추출 중 발견한 비자명 사실(숨은 명령, 채널별 차이, 위험해 보이는 동작, 파서의 특이 규칙 — 예: 백스페이스 처리, 버퍼 한계)을 사실 위주로.

## 5. 작업 규칙

- 위험 등급 분류 기준(README의 표)을 적용하되, 분류가 애매하면 더 위험한 쪽으로 두고 `risk_reason`에 `"uncertain: ..."`.
- `effect`에 해석·추측 금지. 소스 코드가 하는 일만.
- 산출 YAML은 작성 후 파싱 가능한지 확인하라(yaml 파서 또는 python -c — 단, 이 PC의 `python`은 Windows Store 별칭이라 동작 안 함, `py` 사용).
- 산출물 외 파일 생성·수정 금지.

## 6. 완료 기준

- [ ] 두 YAML의 `commands` 항목 수 ≥ 각 HELP/MHELP 노출 수 (파서 분기가 더 많아야 정상 — 적으면 누락)
- [ ] 전 항목 `source_ref` 보유, 전 항목 `risk`+`risk_reason` 보유
- [ ] R3 분류에 최소 재플래시(REFLASHESP/REFLASHSTM)·FW 다운로드(DOWNBIN)·포맷(FORMAT/WFORMAT) 계열 포함
- [ ] 부팅 메뉴가 `states.boot_menu` + 항목별 commands로 기록됨
- [ ] 텔넷 채널의 실체(별도 명령셋인지 동일 디스패처인지)가 notes에 규명됨
- [ ] YAML 2개 모두 파싱 통과

## 7. 실패 기준 (해당 시 중단하고 보고 — 임의 우회 금지)

1. 파서 구조가 §3 전제와 근본적으로 다름(serialCmd 부재, 명령이 문자열 비교가 아닌 방식 등)
2. 명령 수가 수백 개 이상 등 비정상 규모로 판명
3. 분석 대상 소스가 빌드 산출물 등으로 판단됨(.compile 디렉터리만 있고 원본이 없는 경우 등)
