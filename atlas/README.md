# 장비 명령 아틀라스 (Device Command Atlas)

실장비(SB/SSM 보드)의 시리얼 명령 인터페이스를 지도화한 지식 베이스. AI가 장비를 운용·자동화할 때 참조하는 단일 진실원이며, 완성본은 `plugins/serial-mcp/skills/`의 장비 운영 스킬로 증류된다.

이 디렉터리는 **플러그인 페이로드 밖**이다 — 플러그인 설치에 포함되지 않는 원천 데이터·탐사 기록·작업 문서를 둔다. 이 문서는 **실행자(Codex)와 분석자(Claude)의 계약**이다: 실행자는 아래 포맷대로 기록하고, 분석자는 그 기록만으로 분석한다.

## 구조

```
atlas/
  README.md                                  # 이 문서 — 스키마·규칙
  <device>/                                  # sb-esp / sb-stm / ssm
    <FW버전>.yaml                            # 아틀라스 본체
    notes-source-analysis.md                 # 소스 분석 중 발견한 비자명 사실 (사실만)
    exploration/<YYYY-MM-DD>-<태그>/
      session.jsonl                          # 실측 원본 기록
      summary.md                             # 세션 요약: 커버리지·이상 관찰·중단 사유
    discrepancies.md                         # 소스 주장 vs 실측 불일치
```

## 아틀라스 YAML 스키마

```yaml
device: SB-ESP                  # SB-ESP / SB-STM / SSM
fw_version: SB260610-001        # 분석 기준 버전 (장비 보고 문자열 형식)
source_ref: <레포 URL + 커밋 해시>
version_skew: null              # 장비 배포 버전과 다르면 사실 명시
states:                         # 상태기계
  runtime-serial: { entry: "기본 상태", desc: "..." }
  runtime-telnet: { entry: "텔넷 접속", desc: "..." }
  boot_menu: { entry: "리셋 직후 진입창(타임아웃 명시)", desc: "..." }
commands:
  - name: FWVER                 # 명령 문자열 그대로 (대소문자 보존)
    context: runtime-serial     # 유효 상태/채널. 채널마다 동작이 다르면 별도 항목으로
    syntax: "FWVER"             # 인자 형식 포함 — 소스의 파싱 코드가 근거
    prompts: []                 # 대화형이면 [{ask: "...", expects: "...", default: "..."}]
    effect: "FW 버전 출력"       # 장비에 일어나는 일, 사실만 한 줄
    risk: R0                    # 아래 위험 등급표
    risk_reason: "출력만 하고 상태 변경 없음"
    source_ref: "sb-esp32/SB_ESP32.ino:15013"   # 반드시 채움
    observed: null              # 실측 전 null. 실측 후:
    # observed:
    #   at: "2026-06-12 13:09"
    #   lines: [...]            # 도구 반환 원문 그대로 — 삭제·요약 금지
    #   matches_source: true | false | partial
```

작성 규칙:
- **HELP가 보여주는 목록은 부분집합이다.** 진실은 파서의 분기 전체 — `strcmp`/`==` 비교 전부를 훑어 전수 추출한다.
- **`prompts`가 비어 있지 않은 명령은 블로킹 서브 상태다.** 펌웨어가 메인 루프를 점유한 채 입력을 기다리므로(예: ESP `setConfig()` while(1), STM `SETRFGAIN` while(1)+Send_Alive(false)), 완주하거나 Q로 탈출하기 전까지 정상 로그·보드 동작이 중단된다. 실측·자동화 시 대화형 명령은 반드시 시퀀스를 끝까지 책임지고, 응답 침묵은 프롬프트 대기일 수 있음을 가정한다(빈 줄로 찔러보기 금지 — STM은 빈 줄이 시스템 리셋).
- `effect`에 해석·추측 금지. 소스가 말하는 것만. 불확실하면 `"uncertain: ..."` 접두.
- 한 명령이 채널(serial/telnet)이나 상태에 따라 다르게 동작하면 항목을 분리한다.

## 위험 등급

| 등급 | 정의 | 실측 정책 |
|---|---|---|
| R0 | 조회성 — 출력만, 상태 변경 없음 | 실행 가능 (승인 게이트 하) |
| R1 | 상태 변경, 복원 가능 (설정 쓰기 등) | 백업·복원 절차 + 사람 입회 시에만 |
| R2 | 재부팅·재연결 유발 | 사람 입회 시에만 |
| R3 | 파괴 가능 (재플래시·FW 다운로드·포맷) | **실행 금지** — 소스로만 지도화 |

## 실측 기록 규칙 (session.jsonl)

도구 호출 1회 = 1줄 JSON:

```json
{"seq":1,"phase":"R0-sample","state":"runtime-serial","action":"send_serial_command","args":{"command":"FWVER","port":"COM13","wait_ms":1000},"status":"ok","lines":["...도구 반환 원문 전부..."],"started":"2026-06-12T13:09:40","notes":"이상 없음"}
```

- `lines`는 도구 반환 원문 전부. **배경 로그(보드 간 통신 등)가 섞여도 삭제·요약 금지** — 분리는 분석자 몫.
- 리셋·버퍼 클리어도 한 줄씩 기록한다.
- `notes`에는 사실만 (해석 금지).

## 버전 규칙

- 아틀라스 파일명 = 장비가 보고하는 FW 버전 문자열. 소스에서 못 찾으면 `UNKNOWN-<날짜>.yaml` + notes에 사유.
- 소스 커밋과 장비 배포 버전이 다르면(버전 스큐) `version_skew`에 명시 — 실측 샘플링이 이 스큐를 검증한다.
