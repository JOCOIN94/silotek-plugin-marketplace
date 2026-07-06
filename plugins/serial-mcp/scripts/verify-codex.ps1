#requires -Version 5.1

[CmdletBinding()]
param(
    [string]$Name = "serial-mcp",
    [switch]$RequireDirectConfig
)

$ErrorActionPreference = "Stop"

function Get-CodexHome {
    if ($env:CODEX_HOME -and $env:CODEX_HOME.Trim()) {
        return $env:CODEX_HOME
    }
    return Join-Path $HOME ".codex"
}

function Test-DirectMcpConfig {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ServerName
    )

    $configPath = Join-Path (Get-CodexHome) "config.toml"
    if (-not (Test-Path -LiteralPath $configPath)) {
        return $false
    }

    $escaped = [regex]::Escape($ServerName)
    $pattern = "^\[mcp_servers\.(?:""$escaped""|$escaped)\]\s*$"
    return [bool](Select-String -LiteralPath $configPath -Pattern $pattern -Quiet)
}

$codex = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codex) {
    throw "codex CLI를 찾지 못했습니다. Codex 설치와 PATH를 확인하세요."
}

$json = & $codex.Source mcp get $Name --json 2>$null
if ($LASTEXITCODE -ne 0 -or -not $json) {
    throw "Codex MCP 서버 '$Name' 등록을 찾지 못했습니다. scripts/install-codex.ps1를 먼저 실행하세요."
}

$server = $json | ConvertFrom-Json
$actualCommand = $server.transport.command
$actualArgs = @($server.transport.args)
$expectedArgs = @("--from", "git+https://github.com/JOCOIN94/serial-mcp-server@v1.19.2", "serial-mcp")

if ($actualCommand -ne "uvx") {
    throw "Codex MCP '$Name' command가 uvx가 아닙니다: $actualCommand"
}

if (($actualArgs -join "`0") -ne ($expectedArgs -join "`0")) {
    throw "Codex MCP '$Name' args가 예상과 다릅니다: $($actualArgs -join ' ')"
}

$isDirect = Test-DirectMcpConfig -ServerName $Name
if ($RequireDirectConfig -and -not $isDirect) {
    throw "Codex MCP '$Name'은 보이지만 config.toml의 직접 [mcp_servers] 등록이 아닙니다. 플러그인 경유 MCP일 수 있으니 scripts/install-codex.ps1 -Force를 실행하세요."
}

Write-Host "ok: Codex MCP '$Name' -> uvx --from git+https://github.com/JOCOIN94/serial-mcp-server@v1.19.2 serial-mcp"
if ($isDirect) {
    Write-Host "ok: direct config entry found in CODEX_HOME config.toml"
} else {
    Write-Warning "direct config entry was not found. Codex가 도구를 노출하지 않으면 scripts/install-codex.ps1 -Force로 직접 등록하세요."
}
