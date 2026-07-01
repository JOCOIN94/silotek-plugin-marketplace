# Serial MCP plugin

`serial-mcp` is a standalone plugin entry in the Silotek marketplace. It is separate from the `research-log` research-log/diagram plugin; install it only when an AI session needs embedded-board serial logs.

## What lives here

- `.claude-plugin/plugin.json`: Claude Code plugin metadata and inline MCP server registration.
- `.codex-plugin/plugin.json`: Codex plugin metadata and the `serial` skill.
- `scripts/install-codex.ps1`: Codex MCP registration wrapper. It calls `codex mcp add` so Codex exposes the tools through top-level MCP configuration.
- `scripts/verify-codex.ps1`: Read-only Codex registration check.
- `skills/serial/SKILL.md`: The black-box serial debugging loop.

The actual MCP server code lives in `JOCOIN94/serial-mcp-server`. This plugin release is `1.9.1` and pins the server to `v1.6.1`.

## Claude Code install

Claude Code can consume the MCP server from `.claude-plugin/plugin.json`.

```text
/plugin marketplace add <this repository URL or local path>
/plugin install serial-mcp@silotek --scope user
```

## Codex install

Codex currently lists plugin-bundled MCP servers but does not reliably expose their tools to the model. For Codex, install the plugin for the skill and run the direct MCP registration wrapper:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\plugins\serial-mcp\scripts\install-codex.ps1
```

The wrapper registers `SERIAL_CHAR_DELAY=100` by default for the current SB-STM hardware profile. Override it with `-SerialCharDelay <ms>` if another board needs a different transmit delay.

The wrapper also registers `SERIAL_WRITE_CONFIRM=r3` by default (server v1.2.0+), so only destructive R3 commands (reflash/format/download/file-delete/raw JSON injection) raise an approval prompt while reads, recoverable settings, and resets pass through. Override with `-SerialWriteConfirm <all|r3|off>`.

`-SerialWeb 0` disables only the web UI. The server still keeps the default `8743` owner lock so another `serial-mcp` session cannot open the same COM ports at the same time.

Optional fixed-port example:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\plugins\serial-mcp\scripts\install-codex.ps1 -SerialPort COM4 -SerialWeb 8743
```

Verify without changing configuration:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\plugins\serial-mcp\scripts\verify-codex.ps1 -RequireDirectConfig
```

After installing, start a new Codex session. The tools should appear under the `serial-mcp` MCP namespace.
