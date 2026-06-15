# NoCompany truth-source triage

Date: 2026-06-13
Scope: SSM/SB-ESP/STM serial-log debugging with serial-mcp
Purpose: skill distillation note for future AI sessions

## Case Summary

An RF card recognition failure was traced to `NoCompany` mismatch. Local serial configuration changes on SB-ESP and SSM could make the card flow work temporarily, but reboot/synchronization could revert the value if an upstream source later pushed a different `bayConfigs.NoCompany`.

This note is not a web operation guide. Treat the business web/backend setting path as a black box unless the user explicitly asks to inspect it. The skill only needs to determine when the issue is upstream/web-side and stop before making web or DB changes.

## Evidence Pattern

Use serial logs to determine the active truth source:

- SSM local file: `/Bayconfig.txt` contains `CBay[3]`.
- SSM upstream sync: HTTP/processing logs show `bayConfigs` and `NoCompany`.
- SB-ESP local file: SSM responds with `CBay[...]`; SB-ESP then writes `/Bayconfig.txt`.
- STM runtime config: `Reved BayConfig Info` prints `NoCompany:<value>`.

Observed successful propagation after reset:

- SSM reset: `/Bayconfig.txt` read `CBay[3]=47`.
- SSM upstream processing: `bayConfigs` showed `NoCompany : 47`, then SSM wrote `/Bayconfig.txt`.
- SB-ESP reset: received `CBay[15,3000,1000,47,...]` from SSM and saved `/Bayconfig.txt`.
- STM reset: printed `Reved BayConfig Info` with `NoCompany:47`.

Observed failure mode:

- A local `SETBAYCONFIG` can write `47` successfully.
- Later, if SSM receives upstream `bayConfigs.NoCompany=9001`, SSM writes `/Bayconfig.txt` back to `9001`.
- SB-ESP then accepts SSM `CBay[3]=9001`.
- STM eventually receives `NoCompany:9001`.

Therefore, local success is not persistence. Persistence requires checking the next upstream sync/reboot path.

## Triage Rule

If SSM or SB local config is correct but SSM later receives upstream `bayConfigs.NoCompany` with another value and writes it to `/Bayconfig.txt`, classify the problem as upstream web/backend configuration.

At that point:

- Stop repeating `SETBAYCONFIG` on devices.
- Report that the local device chain is being overwritten by an upstream setting.
- Do not change the business web, GraphQL API, Prisma DB, or production DB.
- Do not present the business web UI route as confirmed unless it was explicitly verified in the current task.
- Ask the operator to change the upstream setting through the approved business-web/admin path.

## Required Verification Before Saying Fixed

Do not call the issue fixed after only one local write. Confirm all three layers after reset or sync:

1. SSM: `CBay[3]` or `bayConfigs.NoCompany` is the desired value after reboot/sync.
2. SB-ESP: SSM sends `CBay[...,desired,...]`, and SB-ESP writes `/Bayconfig.txt`.
3. STM: `Reved BayConfig Info` prints `NoCompany:<desired>`.

If any layer disagrees, report the exact layer and stop.

## serial-mcp Operating Rules Learned

- Do not call serial-mcp tools in parallel against multiple ports. Sequential calls avoid duplicate MCP processes, COM port lock contention, and confusing interleaved state.
- For the SSM/SB/STM chain, prefer this order: SSM first, SB-ESP second, STM last.
- Read-only log queries are safe for triage. Writes such as `send_serial_command` and `reset_board` need the user-requested operation and approval-gated behavior.
- Preserve exact log keywords in notes: `CBay[3]`, `NoCompany`, `bayConfigs`, `ReqCBayToSSM`, `Writing file: /Bayconfig.txt`, `Reved BayConfig Info`.

## Graph MCP Usage

Graph MCP helps determine that a value is owned by a web/backend code path, but it must not be treated as permission to edit that code or DB.

Recommended use:

- Use serial-mcp first to prove the device is being overwritten.
- Use graph MCP or `rg` only to identify likely upstream ownership and terminology.
- If the target repo is not indexed, index it read-only/persistence-free first when appropriate.
- Use `rg` for literal Korean UI labels, docs, `.env`, and exact strings because graph search may miss them.

Known project names from this session:

- `C-Users-User-projects-gwangcha-business-web`
- `C-Users-User-projects-silotek-plugin-marketplace`

## Explicit Anti-Pattern

Do not directly modify business-web DB rows while diagnosing serial-device configuration drift. Even if the DB field appears to be the upstream truth source, the correct AI behavior is to report the diagnosis and wait for explicit user authorization for any web/backend write.
