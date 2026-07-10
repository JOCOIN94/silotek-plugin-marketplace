# Serial MCP plugin

`serial-mcp` is a standalone plugin entry in the Silotek marketplace. It is separate from the `research-log` research-log/diagram plugin; install it only when an AI session needs embedded-board serial logs.

## What lives here

- `.claude-plugin/plugin.json`: Claude Code plugin metadata and inline MCP server registration.
- `.codex-plugin/plugin.json`: Codex plugin metadata and bundled component pointers.
- `.mcp.json`: Codex bundled MCP server registration. Plugin install/update carries this pin automatically.
- `hooks/`: Claude Code SessionStart hook (see below).
- `scripts/install-codex.ps1`: Legacy Codex fallback only. Current Codex does not need it for routine install/update.
- `scripts/verify-codex.ps1`: Read-only Codex registration check.
- `skills/serial/SKILL.md`: The black-box serial debugging loop.

The actual MCP server code lives in `JOCOIN94/serial-mcp-server`. This plugin release is `1.22.10` and pins the server to `v1.19.9`.

## Claude Code install

Claude Code can consume the MCP server from `.claude-plugin/plugin.json`.

```text
/plugin marketplace add <this repository URL or local path>
/plugin install serial-mcp@silotek --scope user
```

## SessionStart hook (Claude Code only)

The plugin ships a SessionStart hook that injects a small serial status board at session start (startup/resume/clear/compact):

- If a serial-mcp owner is alive, it queries `http://127.0.0.1:<SERIAL_WEB>/api/status` (read-only, 1s timeout) and injects connected ports plus the viewer URL. If not, it enumerates OS COM port names only (never opens a port). **If no serial port exists, it injects nothing** (zero tokens for unrelated sessions).
- When hardware is present it also injects a 3-line safety kernel (no R3 destructive commands, no writes during the boot window, no retry after a declined approval) so sessions that never load the skills still know the hard limits.
- Windows PowerShell based; a hook failure never blocks session start. Codex has no hook mechanism — the same content is owned by the skills (`serial` ops, board command surfaces), so the hook is an accelerator, not the source of truth.

## Codex install and update

Current Codex loads the serial skill and MCP server together from the plugin. Install or refresh the
marketplace plugin, then start a new Codex task:

```powershell
codex plugin marketplace upgrade silotek --json
codex plugin add serial-mcp@silotek --json
```

The bundled `.mcp.json` sets `SERIAL_CHAR_DELAY=100` for the current SB-STM hardware profile and
`SERIAL_WRITE_CONFIRM=r3` so only destructive R3 commands require approval. Other serial settings
continue to come from the user's environment.

Users upgrading from plugin `1.22.8` or earlier may still have a top-level direct MCP entry that pins
an old server tag. Remove it once so the bundled server owns future updates:

```text
codex mcp remove serial-mcp
```

This is a one-time migration, not a per-release step. If an older Codex build cannot load bundled MCP
servers, `scripts/install-codex.ps1` remains available as a legacy direct-registration fallback.

Verify the effective command and server tag without changing configuration:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\plugins\serial-mcp\scripts\verify-codex.ps1
```

After installing, start a new Codex session. The tools should appear under the `serial-mcp` MCP namespace.
