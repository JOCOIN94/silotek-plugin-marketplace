# serial-mcp SessionStart 훅 — 조건부 상황판 + 안전 커널 주입.
#
# 출력 규칙(토큰 예산):
#   - 시리얼 포트가 하나도 없으면 아무것도 출력하지 않는다(0토큰 — 시리얼 무관 세션 보호).
#   - owner(다른/이전 세션의 serial-mcp)가 살아 있으면 /api/status 로 포트 상태·뷰어 URL 주입.
#   - owner 가 없으면 OS 포트 열거만으로 감지 안내(포트를 절대 열지 않는다 — 소유권·부팅 비간섭).
#   - 안전 커널 3줄은 장비가 있을 때만 함께 주입(스킬 미로드 세션의 게이트 구멍 봉쇄).
# 실패는 전부 무음 — 훅 실패가 세션 시작을 막지 않는다. Windows PowerShell 5.1 호환.
# Codex 에는 훅 메커니즘이 없다 — 같은 내용은 스킬(serial/ops·board command-surface)이 소유한다(패리티).
$ErrorActionPreference = "SilentlyContinue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# SERIAL_WEB 파싱 — 서버와 동일 규칙(기본 8743, 1..65535 만 유효. 0/무효면 뷰어 없음 → 폴백 경로).
$webPort = 8743
$rawWeb = $env:SERIAL_WEB
if ($rawWeb -and ($rawWeb -match '^\d+$')) {
    $n = [int]$rawWeb
    if ($n -ge 1 -and $n -le 65535) { $webPort = $n }
}

$status = $null
try { $status = Invoke-RestMethod -Uri "http://127.0.0.1:$webPort/api/status" -TimeoutSec 1 } catch {}

$lines = @()
if ($status -and $status.ports -and @($status.ports).Count -gt 0) {
    $ports = @($status.ports)
    $connected = @($ports | Where-Object { $_.connected })
    $shown = @($ports | Select-Object -First 8 | ForEach-Object {
        if ($_.name) { "$($_.name)($($_.port))" } else { "$($_.port)" }
    })
    $names = $shown -join ", "
    if ($ports.Count -gt 8) { $names = "$names 외 $($ports.Count - 8)개" }
    # viewer_url 은 MCP 도구 응답 전용 필드 — HTTP 조회에 성공했다는 것 자체가 뷰어 주소의 증거다.
    $lines += "- 포트 $(@($connected).Count)/$($ports.Count) 연결: $names (owner 세션 활성 — 다른 세션이면 뷰어 [해제]로 이양) | 뷰어(사람 교차검증): http://127.0.0.1:$webPort"
}
else {
    $coms = @()
    try { $coms = @([System.IO.Ports.SerialPort]::GetPortNames() | Sort-Object -Unique) } catch {}
    if ($coms.Count -eq 0) { exit 0 }   # 장비 없음 — 무출력
    $names = (@($coms | Select-Object -First 8)) -join ", "
    if ($coms.Count -gt 8) { $names = "$names 외 $($coms.Count - 8)개" }
    $lines += "- 시리얼 포트 감지: $names — serial-mcp 조회 도구 첫 호출 때 자동 연결(owner 획득)된다"
}

$lines += "- 안전: (1) R3 파괴 명령(REFLASHESP·REFLASHSTM·DOWNBIN·FORMAT 등) 실행 금지 (2) reset/재부팅 직후 '부팅 window'엔 어떤 문자도 송신 금지 — 단일 키가 boot-menu 로 들어간다('D'=리플래시) (3) 승인 declined 응답이면 같은 명령 재시도 금지"
$lines += "- 시리얼 명령·조작 전 해당 board 스킬(ssm/sb-esp/sb-stm)의 command-surface 에서 risk 등급을 확인한다"

Write-Output "[serial-mcp] 장비 상황판 (SessionStart 자동 주입)"
$lines | ForEach-Object { Write-Output $_ }
exit 0
