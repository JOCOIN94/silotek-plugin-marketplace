#requires -Version 5.1

[CmdletBinding()]
param(
    [string]$Name = "serial-mcp",
    [string]$PackageSource = "git+https://github.com/JOCOIN94/serial-mcp-server@v1.6.1",
    [string]$PackageCommand = "serial-mcp",
    [string]$SerialPort,
    [string]$SerialNames,
    [string]$SerialAutoname,
    [string]$SerialBaud,
    [string]$SerialTee,
    [string]$SerialExclude,
    [string]$SerialInclude,
    [string]$SerialBufferLines,
    [string]$SerialDedup,
    [string]$SerialWeb,
    [string]$SerialHotplug,
    [string]$SerialWrite,
    [string]$SerialWriteConfirm,
    [string]$SerialCharDelay,
    [switch]$Force,
    [switch]$SkipVerify
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

function Get-McpServer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ServerName
    )

    $json = & $script:Codex.Source mcp get $ServerName --json 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $json) {
        return $null
    }
    return ($json | ConvertFrom-Json)
}

function Invoke-Codex {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & $script:Codex.Source @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "codex $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
    }
}

$script:Codex = Get-Command codex -ErrorAction SilentlyContinue
if (-not $script:Codex) {
    throw "codex CLI를 찾지 못했습니다. Codex 설치와 PATH를 확인하세요."
}

$expectedArgs = @("--from", $PackageSource, $PackageCommand)
$existing = Get-McpServer -ServerName $Name
$hasDirectConfig = Test-DirectMcpConfig -ServerName $Name

if ($existing) {
    $existingArgs = @($existing.transport.args)
    $sameCommand = $existing.transport.command -eq "uvx"
    $sameArgs = (($existingArgs -join "`0") -eq ($expectedArgs -join "`0"))

    if ($hasDirectConfig -and $sameCommand -and $sameArgs -and -not $Force) {
        Write-Host "ok: Codex MCP '$Name' is already directly registered."
        if (-not $SkipVerify) {
            & (Join-Path $PSScriptRoot "verify-codex.ps1") -Name $Name -RequireDirectConfig
        }
        exit 0
    }

    if (-not $hasDirectConfig -and -not $Force) {
        Write-Warning "Codex can see MCP '$Name', but it is not a direct config.toml registration."
        Write-Warning "That usually means an older plugin-bundled MCP entry is shadowing the direct install path."
        throw "Run this script again with -Force after upgrading the serial-mcp plugin, or use -Name serial-mcp-direct for a non-conflicting test registration."
    }

    if ($Force) {
        Write-Host "Removing existing Codex MCP '$Name' before reinstall..."
        & $script:Codex.Source mcp remove $Name
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "codex mcp remove $Name failed. Continuing with add; if add fails, upgrade/remove the old plugin-bundled MCP entry first."
        }
    } else {
        throw "Codex MCP '$Name' already exists with different settings. Re-run with -Force to replace it."
    }
}

$envOptions = [ordered]@{
    PYTHONUTF8 = "1"
    PYTHONIOENCODING = "utf-8"
    # 배포 표준 기본값 — Claude plugin.json의 ${SERIAL_CHAR_DELAY:-100}과 패리티.
    # SB-STM 폴링 수신 문자 유실 대응(실측 atlas/sb-stm/exploration/2026-06-12-r1: 100ms 유실 0).
    # -SerialCharDelay 지정 시 아래 foreach에서 덮어쓴다.
    SERIAL_CHAR_DELAY = "100"
    # 배포 표준 기본값 — Claude plugin.json ${SERIAL_WRITE_CONFIRM:-r3}과 패리티.
    # R3(reflash/format/주입 등) 파괴 명령만 승인 팝업, 그 외는 통과(서버 v1.2.0+).
    # -SerialWriteConfirm 지정 시 아래 foreach에서 덮어쓴다(all/r3/off).
    SERIAL_WRITE_CONFIRM = "r3"
}

foreach ($nameValue in @(
    @("SerialPort", "SERIAL_PORT", $SerialPort),
    @("SerialNames", "SERIAL_NAMES", $SerialNames),
    @("SerialAutoname", "SERIAL_AUTONAME", $SerialAutoname),
    @("SerialBaud", "SERIAL_BAUD", $SerialBaud),
    @("SerialTee", "SERIAL_TEE", $SerialTee),
    @("SerialExclude", "SERIAL_EXCLUDE", $SerialExclude),
    @("SerialInclude", "SERIAL_INCLUDE", $SerialInclude),
    @("SerialBufferLines", "SERIAL_BUFFER_LINES", $SerialBufferLines),
    @("SerialDedup", "SERIAL_DEDUP", $SerialDedup),
    @("SerialWeb", "SERIAL_WEB", $SerialWeb),
    @("SerialHotplug", "SERIAL_HOTPLUG", $SerialHotplug),
    @("SerialWrite", "SERIAL_WRITE", $SerialWrite),
    @("SerialWriteConfirm", "SERIAL_WRITE_CONFIRM", $SerialWriteConfirm),
    @("SerialCharDelay", "SERIAL_CHAR_DELAY", $SerialCharDelay)
)) {
    if ($PSBoundParameters.ContainsKey($nameValue[0])) {
        $envOptions[$nameValue[1]] = $nameValue[2]
    }
}

$addArgs = @("mcp", "add", $Name)
foreach ($key in $envOptions.Keys) {
    $addArgs += @("--env", "$key=$($envOptions[$key])")
}
$addArgs += @("--", "uvx", "--from", $PackageSource, $PackageCommand)

Write-Host "Registering Codex MCP '$Name'..."
Invoke-Codex -Arguments $addArgs

if (-not $SkipVerify) {
    & (Join-Path $PSScriptRoot "verify-codex.ps1") -Name $Name -RequireDirectConfig
}

Write-Host "Done. Start a new Codex session to load the serial-mcp tools."
