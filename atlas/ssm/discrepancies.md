# SSM Source / Readme Discrepancies

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This file exists because P2 found source-vs-Readme or enum-vs-active-branch differences. These are not automatically runtime bugs. They are facts to preserve so downstream analysis uses active SSM260525-004 source instead of stale comments or older Readme entries.

## D1. Communication-Fault Threshold Changed From Readme 50% To Source 35/65 Hysteresis

| Item | Evidence |
|---|---|
| Readme entry | `ReadmeSSM.txt:1178` through `ReadmeSSM.txt:1183` says the C0002 communication-fault criterion remains `<= 50%` bad and `> 50%` normal. |
| Active source | `CRITERIA_JUDGEMENT_COMM_PROBLEM_L = 35.0f` and `_H = 65.0f` are active (`SSM_esp32.h:2050` through `SSM_esp32.h:2052`). |
| Active branch | If currently bad, recovery requires `>= 65%`; otherwise entering bad requires `<= 35%` (`SSM_esp32.ino:1898` through `SSM_esp32.ino:1911`; `SSM_esp32.ino:21106` through `SSM_esp32.ino:21119`). |
| Stale code nearby | A 50% single-threshold branch remains only inside a block comment (`SSM_esp32.ino:21120` through `SSM_esp32.ino:21126`). |

Current-source conclusion: for SSM260525-004, use 35/65 hysteresis. Do not use the older Readme 50% threshold for diagnostics.

## D2. Fault Payload Key Is `faultCode`, Not `message`

| Item | Evidence |
|---|---|
| Older Readme entry | `ReadmeSSM.txt:1227` through `ReadmeSSM.txt:1231` says the fault code number is sent as JSON key `message`. |
| Current source | `Send_FaultCode()` writes `jsonWebTxBuf["faultCode"] = fFaultCode`, `jsonWebTxBuf["reason"] = treason`, and `jsonWebTxBuf["message"] = tmessage` (`SSM_esp32.ino:3541` through `SSM_esp32.ino:3561`). |
| Later Readme example | `ReadmeSSM.txt:1183` already shows a current-style payload with `faultCode:"C0002"` and `message:"0.0"`. |

Current-source conclusion: parser/atlas consumers should treat `faultCode` as the fault-code field and `message` as descriptive detail.

## D3. `UNIT_PRICE = 6` Remains In Enum, But Active Branch Is Replaced By `REQ_UNITPRICE = 20`

| Item | Evidence |
|---|---|
| Enum | `UNIT_PRICE = 6` and `REQ_UNITPRICE = 20` both exist in `OperationType` (`SSM_esp32.h:696` through `SSM_esp32.h:710`). |
| Inactive branch | The `operationType == UNIT_PRICE` branch is inside a block comment marked as replaced by protocol "18. UnitPrice request" (`SSM_esp32.ino:13575` through `SSM_esp32.ino:13604`). |
| Active branch | `operationType == REQ_UNITPRICE` is the active request path and logs `Cmd - REQ_UNITPRICE.` (`SSM_esp32.ino:13660` through `SSM_esp32.ino:13672`). |
| Readme context | Readme notes `REQ_UNITPRICE` and `REQ_ADJUSTUNITTIME` as commands added for SSM-only Socket use without MAC requirement (`ReadmeSSM.txt:1243` through `ReadmeSSM.txt:1246`). |

Current-source conclusion: `UNIT_PRICE = 6` should be treated as legacy/inactive for this source snapshot. Use `REQ_UNITPRICE = 20` for the active Web command atlas.

## D4. `CMD_TO_WSCL = 500` Exists, But Active WSCL Reset Uses Body Field `WSRESET`

| Item | Evidence |
|---|---|
| Enum | `CMD_TO_WSCL = 500` exists, with an inline comment saying SSM does not actually use it in SSM (`SSM_esp32.h:716`). |
| Active source | Socket.IO payload handling checks `msgBody["WSRESET"].as<int>() == 1`, logs `WSCL HW Reset`, and pulses `WSCL_RESET` low/high (`SSM_esp32.ino:15070` through `SSM_esp32.ino:15077`). |
| No active dispatch found | No active `operationType == CMD_TO_WSCL` branch was found in the parser/dispatch source. |

Current-source conclusion: the active WSCL reset command surface is a Web body key `WSRESET`, not an `operationType` 500 dispatch.

## D5. Active Filesystem Name Uses `SPIFFS` Symbol But Implementation Is `LittleFS`

| Item | Evidence |
|---|---|
| Include/alias | `<SPIFFS.h>` is commented, `<LittleFS.h>` is included, and `#define SPIFFS LittleFS` is active (`SSM_esp32.h:23` through `SSM_esp32.h:28`). |
| Active source naming | Many routines and logs still use `SPIFFS` names, for example `SPIFFS_Proc()`, `SPIFFS_Format()`, and `SPIFFS Mount Failed` (`SSM_esp32.ino:18058` through `SSM_esp32.ino:18072`; `SSM_esp32.ino:19869` through `SSM_esp32.ino:19888`). |

Current-source conclusion: documentation may say SPIFFS, but in this source snapshot the active backend is LittleFS via alias.

## Non-Discrepancy Notes

- `COM_CAN`, `HTTPSERVER`, and `DEFMQTT` blocks are present but inactive because the defines are commented out (`SSM_esp32.h:1` through `SSM_esp32.h:2`; `SSM_esp32.h:68`). This is not a source mismatch; it is a compile-state fact.
- Readme change-log entries are historical. Prefer active source branches when they conflict with older entries.
