# SSM OTA Lifecycle Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This note records the OTA/download/reflash lifecycle implemented in SSM source. It covers Web-triggered commands, serial test commands, SSM-side file download, lower-device ESP-NOW OTA preparation, status reporting to Web, and cleanup/failure signatures.

## OTA State Model

| Symbol / field | Meaning | Source anchors |
|---|---|---|
| `UP_DOWN`, `UP_FORMAT`, `UP_READY`, `UP_CHKFILES`, `UP_MERGE`, `UP_REFLASH`, `UP_RESET`, `UP_INIT`, `UP_CANCDOWN`, `UP_ERASE` | OTA process steps | `SSM_esp32.h:1917` |
| `DAT_NO`, `DAT_SUCC`, `DAT_FAIL`, `DAT_CANCEL`, `DAT_ING` | Result states used in `resultUpdate[]` | `SSM_esp32.h:1919` through `SSM_esp32.h:1930` |
| `TargetsPreparedForUpdate` | Bitmask of device types queued for download/reflash | `SSM_esp32.ino:17440` through `SSM_esp32.ino:17496`, `SSM_esp32.ino:17914` through `SSM_esp32.ino:17973` |
| `DownloadedFile` | Bitmask of firmware files already downloaded/staged for lower devices | `SSM_esp32.ino:17714` through `SSM_esp32.ino:17729`, `SSM_esp32.ino:8307` through `SSM_esp32.ino:8314` |
| `fworkingDownload` | Busy flag while lower-device download/piece movement is active | `SSM_esp32.ino:8195` through `SSM_esp32.ino:8198`, `SSM_esp32.ino:8307` |
| `dnTimerOTAProcess` | OTA watchdog/guard timer; defined by `TIMEOTAPROCESS = 10000` | `SSM_esp32.h:1944` through `SSM_esp32.h:1945` |
| `RETRY_CNT_OTA_HTTP_DOWNLOAD` | HTTP binary download retry count, value 3 | `SSM_esp32.h:1957` |

`InitInfoBufferOfUpdate()` clears SSM OTA display/progress state, resets `ProgressDownLoadForSSM`, `ftargetOTAForSSM`, `OTA_ElapsedTime`, each device `resultUpdate[]`, and selected progress fields (`SSM_esp32.ino:1385` through `SSM_esp32.ino:1409`).

## Web Request Entry Points

The Web command handler supports two query-style requests before command execution:

| Request | Response fields | Source anchors |
|---|---|---|
| `requestType = "OTAProgress"` | `progress[pos][0] = deviceIDUsingWeb`, `progress[pos][1] = ProgressDownLoad` | `SSM_esp32.ino:12149` through `SSM_esp32.ino:12170` |
| `requestType = "OTAState"` | `state[pos]` includes device ID, downloaded FW version, target flag, progress, and per-step err/result/elapsed triplets | `SSM_esp32.ino:12175` through `SSM_esp32.ino:12199` |

Command-style requests are accepted when `type` is one of `download`, `canceldown`, `reflash`, `erase`, or `ReqDownedFwVer`, with `chipType` and `deviceTypeId` required except for the downloaded-version request path (`SSM_esp32.ino:12214` through `SSM_esp32.ino:12217`).

## Web Command Admission And Rejection

- SSM rejects OTA commands if both communication-state and config-report readiness are false (`fgotCommState == false && fReportConfig == false`) (`SSM_esp32.ino:12225` through `SSM_esp32.ino:12228`).
- `canceldown` is rejected when nothing is busy; `download`, `reflash`, and `erase` are rejected while any of `TargetsPreparedForUpdate`, `DownloadedFile`, or `fworkingDownload` is set (`SSM_esp32.ino:12229` through `SSM_esp32.ino:12242`).
- Rejection response sets `Done = "NOK"`, echoes `reqId`, and builds reason fragments such as `1.Not Ready.`, `2.There are still things to update.`, `3.The download is not completely finished.`, and `4.Moving data to targets.` (`SSM_esp32.ino:12244` through `SSM_esp32.ino:12300`).
- Accepted commands set `Done = "OK"` and echo `reqId` before execution continues (`SSM_esp32.ino:12302` through `SSM_esp32.ino:12325`).

## Target Selection

- `deviceTypeId` maps to SSM/APU/APU_C/SB/Repetater file numbers and internal unit types. SB uses `chipType` to distinguish ESP32 and STM32; wrong chip type logs `[Proc-Err] Wrong CMD - chipType err.` (`SSM_esp32.ino:12354` through `SSM_esp32.ino:12400`).
- If `tdeviceId[]` is present, SSM resolves Web device IDs against `InfoListArr[pos].deviceIDUsingWeb` and stores `ONLYYOUFOROTA + mac` in `TargetForOTA[]` (`SSM_esp32.ino:12337` through `SSM_esp32.ino:12351`, `SSM_esp32.ino:12416` through `SSM_esp32.ino:12445`).
- If no explicit target list is present, SSM targets all devices of the selected type whose communication state is normal (`SSM_esp32.ino:12456` through `SSM_esp32.ino:12468`, `SSM_esp32.ino:12499` through `SSM_esp32.ino:12510`).
- If no target can be selected for a lower-device operation, `fallowOTA` becomes false and command processing does not enter the OTA operation block (`SSM_esp32.ino:12514` through `SSM_esp32.ino:12528`).

## Command Types

| Web `type` | Main action | Source anchors |
|---|---|---|
| `ReqDownedFwVer` | Sends `DNFWVER = "REQ"` to selected targets or `"ALL"` to all same-type devices | `SSM_esp32.ino:12529` through `SSM_esp32.ino:12591` |
| `canceldown` | Sends `UP_CANCDOWN` to selected/all lower devices; cannot cancel SSM download; clears busy state synchronously | `SSM_esp32.ino:12592` through `SSM_esp32.ino:12647` |
| `erase` | Sends `UP_ERASE` to selected/all lower devices; cannot erase SSM memory through this path | `SSM_esp32.ino:12648` through `SSM_esp32.ino:12690` |
| `download` | Queues `TargetsPreparedForUpdate` and later runs `Update_proc(UP_DOWN)` | `SSM_esp32.ino:17417` through `SSM_esp32.ino:17757`, `SSM_esp32.ino:21009` through `SSM_esp32.ino:21025` |
| `reflash` | Queues target type and later runs `Update_proc(UP_REFLASH)` | `SSM_esp32.ino:17912` through `SSM_esp32.ino:18047`, `SSM_esp32.ino:21027` through `SSM_esp32.ino:21036` |

## Binary Download To SSM SPIFFS

- Firmware download endpoint is `https://device.silotek.co.kr/bin/download` (`SSM_esp32.h:96`).
- `SaveOtaBinFromWebServerToSPIFFS()` uses a static 768-byte buffer, 30-second idle timeout, `Connection: close`, JSON POST body, and `WaitForHttpPostSlot("OTA bin download")` (`SSM_esp32.ino:17269` through `SSM_esp32.ino:17300`).
- It accepts HTTP 2xx only, streams either fixed content-length bytes or chunked/unknown-length body into SPIFFS, logs progress every 65536 bytes, verifies stored byte count, and validates ESP32 app magic `0xE9` except for `/SB_STM32.bin` (`SSM_esp32.ino:17168` through `SSM_esp32.ino:17267`, `SSM_esp32.ino:17308` through `SSM_esp32.ino:17393`).
- On failure it closes HTTP, marks the HTTP slot done, removes partial firmware file, and returns the error (`SSM_esp32.ino:17397` through `SSM_esp32.ino:17413`).
- `Update_proc(UP_DOWN)` selects file names `/SSM.bin`, `/APU.bin`, `/APUC.bin`, `/SB_ESP32.bin`, `/SB_STM32.bin`, or `/RPT.bin` from `TargetsPreparedForUpdate` (`SSM_esp32.ino:17430` through `SSM_esp32.ino:17496`).
- HTTP download retries transient connection/send/not-connected/lost/read-timeout errors up to `RETRY_CNT_OTA_HTTP_DOWNLOAD` and reports failed end-of-download to Web on failure (`SSM_esp32.ino:17577` through `SSM_esp32.ino:17608`).

## Lower-Device OTA Preparation

- After a non-SSM binary is staged, SSM records `DownloadedFile`, total packet count, file size, `bkTypeOfUnit`, and sets `fNotDoingToReadyForOTA = true` so `sendProcToReadyForOTA()` can run (`SSM_esp32.ino:17714` through `SSM_esp32.ino:17729`).
- `EnsureFreshTargetForOTA()` waits for fresh INFO from explicit targets before binary preparation; stale or missing target state logs `[OTA] Waiting for fresh INFO ...` and sends `ReqInfoTo(tmac)` (`SSM_esp32.ino:16810` through `SSM_esp32.ino:16849`).
- `sendProcToReadyForOTA()` sends `UP_INIT` twice, moves to `UP_FORMAT`, then eventually sends `UP_READY` twice (`SSM_esp32.ino:16853` through `SSM_esp32.ino:17079`).
- For legacy targets with no `UP_INIT` response, SSM logs `No UP_INIT response ... Trying legacy UP_FORMAT fallback`, sends `UP_FORMAT` three times, waits the legacy format timeout, and advances to `UP_READY` (`SSM_esp32.ino:16960` through `SSM_esp32.ino:16992`).
- `retChkIfSendingAgain()` advances selected-target format flow only if at least one target reports `UP_FORMAT` success; otherwise it cancels the download command (`SSM_esp32.ino:16747` through `SSM_esp32.ino:16807`).

## Binary ESP-NOW Frame

Lower-device binary/OTA commands use `sendMessage(uint8_t cmd, uint8_t target, uint16_t NoPacket, uint16_t NoTPacket, char* buf, uint8_t length)`, not the JSON sender.

- Frame starts with `cHidden ^ 0xFF`, then `<`, command nibble mixed with `baseMac[4]`, target nibble mixed with `baseMac[4]`, target ID from `baseMac[5]`, packet number, total packet count, data length, payload, checksum, and `>` (`SSM_esp32.ino:5484` through `SSM_esp32.ino:5595`).
- Payload size must be less than `PSIZE`; final packet must fit under `DATAMAXSIZE` (`SSM_esp32.ino:5506` through `SSM_esp32.ino:5510`, `SSM_esp32.ino:5581` through `SSM_esp32.ino:5610`).
- Outgoing binary frames are recorded with `WrSendedPacket()` before sending (`SSM_esp32.ino:5622` through `SSM_esp32.ino:5626`).
- Prep commands `UP_INIT`, `UP_FORMAT`, and `UP_READY` are broadcast 5 times; other binary packets are sent once (`SSM_esp32.ino:5631` through `SSM_esp32.ino:5640`).
- The SSM-side inter-binary-transmission gap is set to 30 ms, matching the SSM260519-002 speed improvement note (`SSM_esp32.ino:5671` through `SSM_esp32.ino:5674`, `ReadmeSSM.txt:54` through `ReadmeSSM.txt:59`).

## Lower-Device Result Handling

Lower devices report `devType`, `procStep`, `errType`, and/or `RepData`.

- Any OTA status packet refreshes `dnTimerOTAProcess` (`SSM_esp32.ino:8151` through `SSM_esp32.ino:8158`).
- `errType` records per-step errors and logs `*** [Got Err.] devType ... Step ... Err ...` (`SSM_esp32.ino:8159` through `SSM_esp32.ino:8188`).
- `UP_READY` success marks lower-device download as in progress and can complete the ready stage for all units (`SSM_esp32.ino:8202` through `SSM_esp32.ino:8221`).
- `UP_MERGE` success/failure is treated as download completion/failure; SSM calls `Send_statusOfDownload()` with `true` or `false`, sets progress to 100 on success, stores `downFWVer`, and clears `fworkingDownload`/`DownloadedFile` when all units complete (`SSM_esp32.ino:8233` through `SSM_esp32.ino:8315`).
- `UP_REFLASH` success/failure calls `Send_statusOfReflash()`, then sends `UP_RESET` twice. When all units finish, SSM clears `DownloadedFile`, `TargetsPreparedForUpdate`, and `InitInfoBufferOfUpdate()` (`SSM_esp32.ino:8317` through `SSM_esp32.ino:8349`).
- `UP_CANCDOWN` clears `fworkingDownload`, `Updatestep`, and `DownloadedFile`; `UP_ERASE` also clears progress and downloaded FW version (`SSM_esp32.ino:8359` through `SSM_esp32.ino:8380`).
- Orphan `UP_CHKFILES` after cancel is ignored when both `TargetsPreparedForUpdate` and `DownloadedFile` are zero (`SSM_esp32.ino:8432` through `SSM_esp32.ino:8441`; `ReadmeSSM.txt:62` through `ReadmeSSM.txt:66`).

## Web Status Reporting

- `Send_statusOfDownload()` posts `authCode`, `chipType`, and `done` to `/device/{deviceId}/download/done`; it uses SSM's own `SSMdeviceId` for `MacAddr`, otherwise the lower device's `deviceIDUsingWeb` (`SSM_esp32.ino:3320` through `SSM_esp32.ino:3370`).
- `Send_statusOfReflash()` posts the same field shape to `/device/{deviceId}/reflash/done` (`SSM_esp32.ino:3375` through `SSM_esp32.ino:3425`).
- `Send_EndOfDownloadFromWebToSSM()` posts `/device/{SSMdeviceId}/sharing` with `sharing = "true"` or `"false"` after SSM finishes or fails Web binary download (`SSM_esp32.ino:3431` through `SSM_esp32.ino:3465`).

## SSM Self-Reflash

- `ReflashProc()` only acts if `/SSM.bin` exists in SPIFFS; it opens the file, calls `UpdateSsmFirmwareFromSPIFFS()`, and on success schedules `ResetTime = 5000`, `fReset = true`, and prints `Reboot...` (`SSM_esp32.ino:16691` through `SSM_esp32.ino:16718`).
- Failure modes include missing `/SSM.bin`, open failure, and update write failure (`SSM_esp32.ino:16720` through `SSM_esp32.ino:16737`).
- Web-targeted SSM reflash path calls `ReflashProc()` and reports `/reflash/done` for `MacAddr`/`ESP32` (`SSM_esp32.ino:18035` through `SSM_esp32.ino:18043`).
- Serial `REFLASHESP` directly calls `ReflashProc()` (`SSM_esp32.ino:19350` through `SSM_esp32.ino:19352`).

## Serial And Boot Test Surfaces

- `DOWNBINWEB` prompts for target unit number, sets `TargetsPreparedForUpdate`, removes non-special files if download is not skipped, disables extended unit info, and refreshes `dnTimerOTAProcess` (`SSM_esp32.ino:19262` through `SSM_esp32.ino:19308`).
- `SKIPDOWNLOAD` sets `fSkipDownload = true` (`SSM_esp32.ino:19310` through `SSM_esp32.ino:19314`).
- `ALLREFLASH` targets all unit classes including SSM/APU/APUC/SB_ESP32/SB_STM32/RPT, sets `fReflash`, `Updatestep = 1`, and refreshes `dnTimerOTAProcess` (`SSM_esp32.ino:19315` through `SSM_esp32.ino:19323`).
- `REFLASH` prompts for one unit class and sets `TargetsPreparedForUpdate`, `fReflash`, `Updatestep = 1`, and `dnTimerOTAProcess` (`SSM_esp32.ino:19324` through `SSM_esp32.ino:19349`).
- `DOWNBIN` and `CDOWNBIN` call `downBin(true)` and `downBin(false)` respectively (`SSM_esp32.ino:19354` through `SSM_esp32.ino:19360`).
- Boot-menu `D` calls `downBin(false)` and then `ReflashProc()` if `fReflash` is true (`SSM_esp32.ino:19988` through `SSM_esp32.ino:19994`).

## Cleanup And Stuck Fix Anchors

- SSM260519-003 Readme records the stuck fix after all-unit `UP_REFLASH`: clear `DownloadedFile`, clear `TargetsPreparedForUpdate`, and call `InitInfoBufferOfUpdate()` (`ReadmeSSM.txt:47` through `ReadmeSSM.txt:51`; `SSM_esp32.ino:8338` through `SSM_esp32.ino:8348`).
- SSM260518-001 Readme records synchronous `canceldown` cleanup so lost ESP-NOW ACK does not keep later commands blocked by `Err #3 / 4.Moving data to targets` (`ReadmeSSM.txt:71` through `ReadmeSSM.txt:74`; `SSM_esp32.ino:12639` through `SSM_esp32.ino:12646`).
- SSM260515-003 and SSM260514-001 document legacy APU_C/SB no-`UP_INIT` fallback; current source sends repeated `UP_FORMAT` before `UP_READY` for legacy targets (`ReadmeSSM.txt:77` through `ReadmeSSM.txt:80`, `ReadmeSSM.txt:121` through `ReadmeSSM.txt:124`; `SSM_esp32.ino:16960` through `SSM_esp32.ino:16992`).
- SSM260514-004 and SSM260513-006/005 document SSM downloader stabilization: chunked body handling, magic byte validation, static buffer, and partial-file removal (`ReadmeSSM.txt:127` through `ReadmeSSM.txt:132`, `ReadmeSSM.txt:151` through `ReadmeSSM.txt:161`; `SSM_esp32.ino:17183` through `SSM_esp32.ino:17413`).

## Failure Signatures

| Signature | Interpretation | Source anchors |
|---|---|---|
| `>>>> Reject the command - DOWNLOAD/REFLASH/ERASE` | Admission gate rejected due to readiness or busy state | `SSM_esp32.ino:12244` through `SSM_esp32.ino:12279` |
| `Err. #3` plus `4.Moving data to targets.` | `fworkingDownload` is still true | `SSM_esp32.ino:12269` through `SSM_esp32.ino:12273` |
| `err - Save a FW stable... Removed partial file` | SSM Web binary download failed and partial file was deleted | `SSM_esp32.ino:17402` through `SSM_esp32.ino:17410` |
| `Wrong ESP32 app image magic byte` | Downloaded ESP32 image is not a valid ESP32 app image | `SSM_esp32.ino:17239` through `SSM_esp32.ino:17266` |
| `UP_CHKFILES ignored: no OTA target prepared` | Post-cancel orphan piece request was suppressed | `SSM_esp32.ino:8432` through `SSM_esp32.ino:8441` |
| `No UP_INIT response ... legacy UP_FORMAT fallback` | Legacy lower firmware compatibility path | `SSM_esp32.ino:16960` through `SSM_esp32.ino:16992` |
| `Reflash was a success.` then `Reboot...` | SSM self-reflash succeeded and delayed reset is scheduled | `SSM_esp32.ino:16704` through `SSM_esp32.ino:16718` |
