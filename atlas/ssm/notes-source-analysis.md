# SSM Source Analysis Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Source Version

- Firmware version is `SSM260525-004`, defined by `FW_VERSION` in `SSM_esp32.h:4`.
- `versionInfo` is initialized from `FW_VERSION` in `SSM_esp32.h:102`.
- `ReadmeSSM.txt` top entry is `~260525(SSM260525-004)`, matching the source version (`ReadmeSSM.txt:1`).
- Source repo HEAD was verified as `178e29f7e94ab4ba2b1e1e2059e097bb377a2b98`; all outputs use `https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98` as source basis.

## Total Command Count

- YAML command entries: 70.
- `serialCmd(String str)` logical live commands: 56.
- Direct top-level `str == "..."` branches in `serialCmd`: 54, after excluding block-commented branches and the nested `Q` prompt branch inside `REQSTCOMM`.
- Prefix-detected `serialCmd` commands: 2 (`BYPASSCMD`, `VIRWEBCMD`) from manual character-prefix tests before the dispatch ladder (`SSM_esp32.ino:18899`, `SSM_esp32.ino:18903`).
- Parser/help entries outside `serialCmd`: 9. AP-mode/telnet parser has `HELP`, `???`, `MHELP`, `HHELP`, `THELP`; runtime parser has `HELP`, `???`, `HHELP`, `THELP` (`SSM_esp32.ino:20248`, `SSM_esp32.ino:20253`, `SSM_esp32.ino:20262`, `SSM_esp32.ino:20267`, `SSM_esp32.ino:20967`, `SSM_esp32.ino:20973`, `SSM_esp32.ino:20977`).
- Boot-menu entries: 5 (`D`, `S`, `B`, `I`, `R`) from the reset-time setup window (`SSM_esp32.ino:19980` through `SSM_esp32.ino:20014`).

## Parser Structure

- `serialCmd(String str)` begins at `SSM_esp32.ino:18895`.
- AP-mode/telnet parser dispatches `HELP`/`???`, `MHELP`, `HHELP`, and `THELP` locally, then calls `serialCmd(strtmp)` for other input (`SSM_esp32.ino:20248` through `SSM_esp32.ino:20289`).
- Runtime parser dispatches `HELP`/`???`, `HHELP`, and `THELP` locally, then calls `serialCmd(strtmp)` for other input (`SSM_esp32.ino:20967` through `SSM_esp32.ino:20983`).
- Boot menu starts with `tmpcnt = 1000`; received keys are handled as single-character commands, and menu text says any other key extends time (`SSM_esp32.ino:19980`, `SSM_esp32.ino:20024` through `SSM_esp32.ino:20031`).
- Boot-menu `D` calls `downBin(false)` and may call `ReflashProc()` if `fReflash` is true (`SSM_esp32.ino:19988` through `SSM_esp32.ino:19994`).
- Boot-menu `S` calls `setConfig()` and schedules reset on success (`SSM_esp32.ino:19996` through `SSM_esp32.ino:20001`).
- Boot-menu `B` calls `setBayConfig()` (`SSM_esp32.ino:20003` through `SSM_esp32.ino:20005`).
- Boot-menu `I` calls `setSSMID()` and schedules reset on success (`SSM_esp32.ino:20007` through `SSM_esp32.ino:20010`).
- Boot-menu `R` sets `fReset` and breaks the menu loop; after the loop, `fReset` triggers `ESP.restart()` (`SSM_esp32.ino:20012` through `SSM_esp32.ino:20014`, `SSM_esp32.ino:20041` through `SSM_esp32.ino:20044`).

## Two Parser Sites

- AP-mode/telnet `HELP` is short and prints only `RESET, REFLASHESP` (`SSM_esp32.ino:20248` through `SSM_esp32.ino:20251`).
- AP-mode/telnet `MHELP` prints the longer operational command list and includes `CDOWNBIN`, but does not list `STCOMM` (`SSM_esp32.ino:20253` through `SSM_esp32.ino:20260`).
- Runtime `HELP` is long by default and includes `STCOMM`, but does not include `CDOWNBIN` (`SSM_esp32.ino:20967` through `SSM_esp32.ino:20971`).
- AP-mode/telnet `HHELP` lists only `SETSSMID, VSSMID`; runtime `HHELP` adds `CHKMEM, CMPMEM` (`SSM_esp32.ino:20262` through `SSM_esp32.ino:20265`, `SSM_esp32.ino:20973` through `SSM_esp32.ino:20975`).
- AP-mode/telnet `THELP` includes `CLRCURSSID`; runtime `THELP` includes `VRXALLPKTS`; both include `VEXTUNITINFO`, `BYPASSCMD`, `VIRWEBCMD`, `DOWNBINWEB`, `SKIPDOWNLOAD`, `ALLREFLASH`, `CREQINFO`, `CLRINFO`, `REQSTCOMM`, `AUTOTEST`, `VAUTOTEST`, `CLRAUTOTEST`, `TXBINTEST`, and `VREVBUFF` (`SSM_esp32.ino:20267` through `SSM_esp32.ino:20274`, `SSM_esp32.ino:20977` through `SSM_esp32.ino:20981`).

## Hidden Or Non-Obvious Commands

- `BYPASSCMD` and `VIRWEBCMD` are not direct `str ==` comparisons; they are detected by checking the first nine characters before the dispatch ladder (`SSM_esp32.ino:18899` through `SSM_esp32.ino:18905`).
- `CHKMEM` and `CMPMEM` are hidden from runtime `HELP` but exposed by runtime `HHELP` (`SSM_esp32.ino:20973` through `SSM_esp32.ino:20975`).
- `CDOWNBIN` is live in `serialCmd` but only listed in AP-mode/telnet `MHELP`, not runtime `HELP` (`SSM_esp32.ino:19358`, `SSM_esp32.ino:20257`, `SSM_esp32.ino:20969` through `SSM_esp32.ino:20971`).
- `TINFO`, `OLDINFO`, `SERIAL`, and `DUMPFILE` are live `serialCmd` branches but not listed in either runtime `HELP` or AP-mode/telnet `MHELP` (`SSM_esp32.ino:19573`, `SSM_esp32.ino:19577`, `SSM_esp32.ino:19674`, `SSM_esp32.ino:19403`).
- `UPRDY`, `READOUTFW`, and `SCOM` appear inside block-commented regions and were not mapped as live commands (`SSM_esp32.ino:19397` through `SSM_esp32.ino:19418`, `SSM_esp32.ino:19462` through `SSM_esp32.ino:19502`).
- The `Q` comparison inside `REQSTCOMM` is a prompt response, not a top-level command (`SSM_esp32.ino:19586` through `SSM_esp32.ino:19599`).

## Risk Notes

- R3 commands include firmware/file-system destructive or update paths: `D`, `DOWNBINWEB`, `ALLREFLASH`, `REFLASH`, `REFLASHESP`, `DOWNBIN`, `CDOWNBIN`, `REMFILE`, `FORMAT`, `KSFFORMAT`, and `WFORMAT`.
- `BYPASSCMD` and `VIRWEBCMD` were classified R3 because the source accepts arbitrary JSON and passes it into lower-device ESP-NOW or Web-command paths (`SSM_esp32.ino:19076` through `SSM_esp32.ino:19252`).
- Reboot/scheduling commands are R2: `RESET`, `APMODE`, boot-menu `S`, boot-menu `I`, boot-menu `R`, and `SETCONFIG` when it returns success and triggers reboot (`SSM_esp32.ino:18907`, `SSM_esp32.ino:19448`, `SSM_esp32.ino:19532`, `SSM_esp32.ino:19996`, `SSM_esp32.ino:20007`, `SSM_esp32.ino:20012`).

## Inactive Features

- CAN/TWAI is build-disabled because `COM_CAN` is commented out in `SSM_esp32.h:1`; CAN includes and code sit behind `#ifdef COM_CAN` (`SSM_esp32.h:52`, `SSM_esp32.ino:5002`).
- MQTT is build-disabled because `DEFMQTT` is commented out in `SSM_esp32.h:68`; MQTT include/client code sits behind `#ifdef DEFMQTT` (`SSM_esp32.h:70`, `SSM_esp32.ino:229`, `SSM_esp32.ino:18253`, `SSM_esp32.ino:22005`).
- Local HTTP WebServer is build-disabled because `HTTPSERVER` is commented out in `SSM_esp32.h:2`; route setup and handlers sit behind `#ifdef HTTPSERVER` (`SSM_esp32.h:118`, `SSM_esp32.ino:10707`, `SSM_esp32.ino:20105`).
- AP mode itself is active separately from the disabled local HTTP server: `WiFi.softAP()` is called in setup/AP paths (`SSM_esp32.ino:10700`, `SSM_esp32.ino:20072`).
- OLED display should not be mapped as an active operator UI; `disDstMac` OLED-related assignments are commented out (`SSM_esp32.h:211`, `SSM_esp32.ino:13044`, `SSM_esp32.ino:13219`, `SSM_esp32.ino:13270`).
- RS485 / `Serial1` / `Serial2` is not an SSM communication surface in this source analysis. Literal source search found no active `Serial1` or `Serial2` command path; SSM lower-device communication is represented by ESP-NOW send/receive paths such as `sendMessage()` and `OnRevFromWiFiByBoardcating()` (`SSM_esp32.ino:4895`, `SSM_esp32.ino:5316`).

## ReadmeSSM Cross-Checks

- Readme top entry says SSM260525-004 adds urgent REQRSSI refresh for SB EQ pending route plans; source `FW_VERSION` comment repeats that summary (`ReadmeSSM.txt:1` through `ReadmeSSM.txt:6`, `SSM_esp32.h:4`).
- Readme says SSM260525-003 added SB `Event.txt` queue stuck alarm and `C0008`; source contains `ROUTE_EVENT_QUEUE_FAULT_CODE` / `C0008` fault paths, recorded in `notes-fault-codes.md` during P1 (`ReadmeSSM.txt:10` through `ReadmeSSM.txt:14`).
- Readme says SSM260525-002 added Plan A/B route distribution and route-aware event ACK; source contains CHPLAN/route paths, recorded in `notes-espnow-protocol.md` and `atlas/flows.md` during P1 (`ReadmeSSM.txt:18` through `ReadmeSSM.txt:22`).
- Readme says SSM260525-001 preserves `/usage` events when `Send_Operation` is busy; source logs `Busy - saved usage event to Event.txt instead of dropping it.` inside `Send_Operation()` (`ReadmeSSM.txt:27` through `ReadmeSSM.txt:29`, `SSM_esp32.ino:3688`).

## Failure Criteria

- §8.1 parser mismatch: not triggered. `serialCmd(String str)` exists and direct string/prefix dispatch is readable (`SSM_esp32.ino:18895`).
- §8.2 operationType/ESP-NOW mismatch: not triggered. `OperationType` enum exists in `SSM_esp32.h:696` through `SSM_esp32.h:717`; ESP-NOW callback exists at `SSM_esp32.ino:4895`; Web operationType dispatch exists at `SSM_esp32.ino:12899` and following branches.
- §8.3 P0 too large for one session: not triggered.
- §8.4 original source absent: not triggered. Source files `SSM_esp32.h`, `SSM_esp32.ino`, and `ReadmeSSM.txt` are present in the source repo.

## Open Questions

- Deployed hardware version is not verified. `version_skew` remains source-only until a later serial observation confirms the field device FW string.
- `BYPASSCMD` and `VIRWEBCMD` accept arbitrary JSON; downstream risk depends on payload, so the atlas keeps them R3 rather than trying to enumerate payload-specific behavior.
- Some ReadmeSSM history describes legacy behavior across many versions; this atlas records behavior only when the current HEAD source path was found.
- Local HTTP WebServer code is present behind `HTTPSERVER`, but `HTTPSERVER` is disabled in the current header. Future firmware builds that define it would need a separate active-surface pass.
