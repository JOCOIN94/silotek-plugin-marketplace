#requires -Version 5.1
<#
.SYNOPSIS
  serial-mcp 버전 핀 정합성 검증 — 릴리스 전 실행. 불일치 시 throw(비정상 종료).
.DESCRIPTION
  버전 bump 때 사람이 일부 파일을 빠뜨리는 사고를 기계가 막는다.
  두 종류의 정합성을 검사한다:
    (1) 플러그인 version  : 루트 marketplace.json entry ↔ .claude-plugin/plugin.json ↔ .codex-plugin/plugin.json
    (2) Codex 번들 MCP    : .codex-plugin/plugin.json mcpServers ↔ .mcp.json
    (3) 서버 태그 @vX.Y.Z : Claude/Codex MCP args ↔ install-codex.ps1 ↔ verify-codex.ps1
  특히 marketplace.json entry version을 빠뜨리면 실행(서버 태그)은 최신이어도
  /plugin browse 목록이 옛 버전으로 남는다(2026-06 실제 발생).
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path

$marketplaceJson  = Join-Path $repoRoot ".claude-plugin\marketplace.json"
$claudePluginJson = Join-Path $repoRoot "plugins\serial-mcp\.claude-plugin\plugin.json"
$codexPluginJson  = Join-Path $repoRoot "plugins\serial-mcp\.codex-plugin\plugin.json"
$codexMcpJson     = Join-Path $repoRoot "plugins\serial-mcp\.mcp.json"
$installPs1       = Join-Path $PSScriptRoot "install-codex.ps1"
$verifyPs1        = Join-Path $PSScriptRoot "verify-codex.ps1"

# uvx 패키지 소스 문자열에서 서버 태그(serial-mcp-server@vX.Y.Z)를 뽑는다.
function Get-ServerTag {
    param([string]$Text)
    if (-not $Text) { return $null }
    $m = [regex]::Match($Text, "serial-mcp-server@(v[0-9][^""' )]*)")
    if ($m.Success) { return $m.Groups[1].Value }
    return $null
}

$problems = @()

# --- (1) 플러그인 version 정합성 ---
$mkt = Get-Content -Raw -LiteralPath $marketplaceJson | ConvertFrom-Json
$entry = $mkt.plugins | Where-Object { $_.name -eq "serial-mcp" }
if (-not $entry) { throw "marketplace.json에서 serial-mcp entry를 찾지 못했습니다: $marketplaceJson" }
$claude = Get-Content -Raw -LiteralPath $claudePluginJson | ConvertFrom-Json
$codex  = Get-Content -Raw -LiteralPath $codexPluginJson  | ConvertFrom-Json

$pluginVersions = [ordered]@{
    "marketplace.json"   = $entry.version
    "claude plugin.json" = $claude.version
    "codex plugin.json"  = $codex.version
}
$distinctVer = @($pluginVersions.Values | Select-Object -Unique)
if ($distinctVer.Count -ne 1) {
    $detail = ($pluginVersions.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ", "
    $problems += "플러그인 version 불일치: $detail"
}

# --- (2) Codex 번들 MCP 계약 ---
if ($codex.mcpServers -ne "./.mcp.json") {
    $problems += "Codex plugin.json mcpServers가 './.mcp.json'을 가리키지 않습니다: $($codex.mcpServers)"
}

$codexMcp = $null
if (-not (Test-Path -LiteralPath $codexMcpJson)) {
    $problems += "Codex 번들 MCP 파일이 없습니다: $codexMcpJson"
} else {
    $codexMcp = Get-Content -Raw -LiteralPath $codexMcpJson | ConvertFrom-Json
    if (-not $codexMcp.mcpServers.'serial-mcp') {
        $problems += "Codex .mcp.json에서 serial-mcp 서버를 찾지 못했습니다."
    }
}

# --- (3) 서버 태그 @vX.Y.Z 정합성 ---
$argsTag    = @($claude.mcpServers.'serial-mcp'.args | ForEach-Object { Get-ServerTag $_ } | Where-Object { $_ }) | Select-Object -First 1
$codexTag   = @($codexMcp.mcpServers.'serial-mcp'.args | ForEach-Object { Get-ServerTag $_ } | Where-Object { $_ }) | Select-Object -First 1
$installTag = Get-ServerTag (Get-Content -Raw -LiteralPath $installPs1)
$verifyTag  = Get-ServerTag (Get-Content -Raw -LiteralPath $verifyPs1)

$serverTags = [ordered]@{
    "claude plugin.json args" = $argsTag
    "codex .mcp.json args"     = $codexTag
    "install-codex.ps1"       = $installTag
    "verify-codex.ps1"        = $verifyTag
}
foreach ($item in $serverTags.GetEnumerator()) {
    if (-not $item.Value) {
        $problems += "서버 태그를 찾지 못했습니다: $($item.Key)"
    }
}
$distinctTag = @($serverTags.Values | Where-Object { $_ } | Select-Object -Unique)
if ($distinctTag.Count -ne 1) {
    $detail = ($serverTags.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ", "
    $problems += "서버 태그(@vX.Y.Z) 불일치: $detail"
}

if ($problems.Count -gt 0) {
    foreach ($p in $problems) { Write-Host "FAIL: $p" }
    throw "serial-mcp 버전 핀 정합성 실패 — 릴리스 전 위 항목을 동기화하세요."
}

Write-Host "ok: serial-mcp 플러그인 version=$($distinctVer[0]), 서버 태그=$($distinctTag[0])"
