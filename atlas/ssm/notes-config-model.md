# SSM Config Model Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This note maps SSM configuration storage and synchronization visible in source. It distinguishes local SPIFFS/secret files, Web-fetched configuration, serial/manual configuration, and lower-device `CBay` propagation.

## Persistent Files

| File | Source constant | Primary content | Source anchors |
|---|---|---|---|
| `/Security.txt` | `Secretfilename` | JSON object containing `authCode` | `SSM_esp32.h:224`, `SSM_esp32.ino:9875` through `SSM_esp32.ino:9899`, `SSM_esp32.ino:10284` through `SSM_esp32.ino:10298` |
| `/config.txt` | `cfgfilename` | General network/AP/SID/registered MAC config JSON | `SSM_esp32.h:225`, `SSM_esp32.ino:9901` through `SSM_esp32.ino:10062`, `SSM_esp32.ino:10301` through `SSM_esp32.ino:10498` |
| `/Bayconfig.txt` | `Baycfgfilename` | `CBay` array for bay operation/config/master-card values | `SSM_esp32.h:226`, `SSM_esp32.ino:10064` through `SSM_esp32.ino:10230`, `SSM_esp32.ino:10501` through `SSM_esp32.ino:10620` |
| `/Event.txt` | `EventToSendfilename` | Saved Web events for retry | `SSM_esp32.h:228` |
| `/bkEvent.txt` | `bkEventToSendfilename` | Backup event file | `SSM_esp32.h:229` |

## In-Memory Structures

### Config

`Config` is declared in `SSM_esp32.h:317` through `SSM_esp32.h:354`.

| Field group | Fields |
|---|---|
| WiFi credentials | `ssid`, `passwd`, `testssid`, `testpasswd` |
| Static station IP | `staIp1` through `staIp4`, `staPort`, `staMask1` through `staMask4`, `staGwIp1` through `staGwIp4` |
| Public endpoint | `pubIp1` through `pubIp4`, `pubPort` |
| AP / site ID | `apSsid`, `Sid` |
| Registered lower-device MAC table | `RegMacBuff[APU_MAX_INDEX][6]` |

`config.Sid` is operationally important beyond display: boot-time `SPIFFS_Proc()` computes `cHidden` from `255 - config.Sid`, and the ESP-NOW JSON/binary send paths use `cHidden` for obfuscation (`SSM_esp32.ino:18288` through `SSM_esp32.ino:18293`; see also `notes-espnow-protocol.md`).

### ConfigBay

`ConfigBay` is declared and default-initialized in `SSM_esp32.h:791` through `SSM_esp32.h:827`.

| `CBay` index | Field | Default / range notes |
|---:|---|---|
| 0 | `EndTimeToInform` | Default 15 seconds |
| 1 | `Price1st` | Default 3000 |
| 2 | `Price2nd` | Default 1000 |
| 3 | `NoCompany` | `DEFNOCOMPANY`; source comments range 1-65535, with 0 as unlimited |
| 4 | `TempoStopCount` | Default 1 |
| 5 | `TempoStopTime` | Default 5 minutes in ms |
| 6 | `fOperOneTimeTouch` | Default `false` in initializer |
| 7 | `fUseBubble` | Default `true` |
| 8 | `fUseUnder` | Default `true` |
| 9 | `fUseCoating` | Default `false` |
| 10[0] | `MasterCardSecurity` | Security byte |
| 10[1] | `NoRegCard` | Registered master-card count |
| 10[2][t][j] | `MasterCard` | Up to `MAXMANAGECARD` 4-byte card entries |

## Boot-Time Load And Defaulting

`SPIFFS_Proc()` is the boot-time configuration loader:

- Loads `/Security.txt` with `loadSecretfile()` if present; otherwise creates it with `saveSecretfile()` (`SSM_esp32.ino:18232` through `SSM_esp32.ino:18243`).
- If `authCode` is empty after loading, enters `setSSMID()` (`SSM_esp32.ino:18245` through `SSM_esp32.ino:18250`).
- Loads `/config.txt` with `loadConfig()` if present; otherwise writes defaults with `saveConfig()` (`SSM_esp32.ino:18262` through `SSM_esp32.ino:18275`).
- Prints `/config.txt`, views registered MAC buffer, builds `pubIp`, and computes `cHidden` from `config.Sid` (`SSM_esp32.ino:18278` through `SSM_esp32.ino:18293`).
- Loads `/Bayconfig.txt` with `loadBayConfig()` if present; otherwise writes defaults with `saveBayConfig()` (`SSM_esp32.ino:18295` through `SSM_esp32.ino:18308`).

`loadConfig()` repairs missing `ssid`, `passwd`, `testssid`, `testpasswd`, `apSsid`, `Sid`, and `RegMac` by applying defaults and setting `cfg_save_flag` (`SSM_esp32.ino:9923` through `SSM_esp32.ino:10035`). `saveConfig()` writes the same JSON keys and repairs null/empty values before writing `/config.txt` (`SSM_esp32.ino:10301` through `SSM_esp32.ino:10498`).

`loadBayConfig()` expects a `CBay` array. If absent or invalid, it writes defaults; it clamps `NoCompany` to `DEFNOCOMPANY` if out of 0-65535 and resets invalid master-card data (`SSM_esp32.ino:10083` through `SSM_esp32.ino:10225`). `saveBayConfig()` writes `CBay[0..10]` and repairs invalid ranges before writing `/Bayconfig.txt` (`SSM_esp32.ino:10501` through `SSM_esp32.ino:10620`).

## SSMID / authCode

- `authCode` is a global `String` and is sent in nearly every Web HTTP payload (`SSM_esp32.h:201`).
- `SIZE_SSMID` is 50, and EEPROM constants still exist, but the active `setSSMID()` path writes via `saveSecretfile()` to `/Security.txt`; EEPROM write is commented out (`SSM_esp32.h:173` through `SSM_esp32.h:175`, `SSM_esp32.ino:14342` through `SSM_esp32.ino:14364`).
- `loadSecretfile()` reads JSON key `authCode`; `saveSecretfile()` serializes `{ "authCode": authCode }` (`SSM_esp32.ino:9875` through `SSM_esp32.ino:9899`, `SSM_esp32.ino:10284` through `SSM_esp32.ino:10298`).
- `/init` response can also update `authCode` from `data.authCode` (`SSM_esp32.ino:2930` through `SSM_esp32.ino:2937`).

## Web-Fetched BayConfig

`Req_BayConfig()` posts `authCode` to `https://device.silotek.co.kr/bayConfig` (`SSM_esp32.ino:3165` through `SSM_esp32.ino:3176`). Successful `/bayConfig` response handling is in `Http_Proc()`:

- If `data.bayConfigs` exists, SSM calls `ChkBayConfig(response)` (`SSM_esp32.ino:3015` through `SSM_esp32.ino:3018`).
- On success, it sets `ReqBayConfigCnt = 0`, `fset_BayConfig = true`, logs `Writing config values...`, calls `saveBayConfig()`, then sends `ReqCBayToSSM = "ALL"` to lower devices (`SSM_esp32.ino:3022` through `SSM_esp32.ino:3043`).

`ChkBayConfig()` maps Web fields into `configBay`:

| Web key | SSM field | Source anchors |
|---|---|---|
| `endTime` | `EndTimeToInform` | `SSM_esp32.ino:4071` through `SSM_esp32.ino:4081` |
| `price1st` | `Price1st` | `SSM_esp32.ino:4083` through `SSM_esp32.ino:4088` |
| `price2nd` | `Price2nd` | `SSM_esp32.ino:4090` through `SSM_esp32.ino:4095` |
| `NoCompany` | `NoCompany` | `SSM_esp32.ino:4097` through `SSM_esp32.ino:4102` |
| `TempStpCnt` | `TempoStopCount` | `SSM_esp32.ino:4104` through `SSM_esp32.ino:4109` |
| `TempStpTime` | `TempoStopTime` in ms | `SSM_esp32.ino:4111` through `SSM_esp32.ino:4116` |
| `cardUsingType` | `fOperOneTimeTouch` | `SSM_esp32.ino:4118` through `SSM_esp32.ino:4123` |
| `useBubble` | `fUseBubble` | `SSM_esp32.ino:4125` through `SSM_esp32.ino:4130` |
| `useUnder` | `fUseUnder` | `SSM_esp32.ino:4132` through `SSM_esp32.ino:4137` |
| `useCoating` | `fUseCoating` | `SSM_esp32.ino:4139` through `SSM_esp32.ino:4144` |
| `mCardSecurity` | `MasterCardSecurity` | `SSM_esp32.ino:4146` through `SSM_esp32.ino:4151` |
| `NomCard`, `mCard` | `NoRegCard`, encrypted `MasterCard` entries | `SSM_esp32.ino:4153` through `SSM_esp32.ino:4184` |

Operational implication: for Web-managed fields such as `NoCompany`, the Web `/bayConfig` response is the upstream truth source. A local serial edit to `/Bayconfig.txt` can be overwritten by the next successful Web bay-config sync.

## Lower-Device CBay Response

Lower devices request bay config using `RCBay`; SSM responds with `CBay` and `Stat = "OK"`:

- For `RCBay == "APU-"` or `"SB-"`, SSM sends `CBay[0..10]` from `configBay`, including `CBay[3] = NoCompany` and master-card data (`SSM_esp32.ino:8026` through `SSM_esp32.ino:8059`).
- For `RCBay == "APU_C-"` or `"APUS-"`, SSM zeroes `CBay[0..9]`, still sends `CBay[3] = NoCompany`, sends master-card data, then appends price-derived `CBay[11..14]` from `strUnitPrice` (`SSM_esp32.ino:8061` through `SSM_esp32.ino:8093`).
- Response copies `Asn` if present, serializes, logs `[Proc-WiFiTx]`, and sends via `sendMessage()` (`SSM_esp32.ino:8096` through `SSM_esp32.ino:8105`).

## Manual / Serial Configuration

- `SETCONFIG` calls `setConfig()`. If `setConfig()` returns 0, SSM disconnects Socket.IO, delays 1500 ms, and restarts (`SSM_esp32.ino:19532` through `SSM_esp32.ino:19552`).
- `setConfig()` is interactive over serial and starts by copying current `config` into a temporary structure (`SSM_esp32.ino:13937` through `SSM_esp32.ino:13956`).
- `SETBAYCONFIG` calls `setBayConfig()` without immediate restart (`SSM_esp32.ino:19554` through `SSM_esp32.ino:19563`).
- `setBayConfig()` is interactive over serial and, if changes are detected, calls `saveBayConfig()` and broadcasts `ReqCBayToSSM = "ALL"` (`SSM_esp32.ino:14379` through `SSM_esp32.ino:14425`, `SSM_esp32.ino:14720` through `SSM_esp32.ino:14824`).
- `SETSSMID` calls `setSSMID()`; `VSSMID` prints current `authCode` (`SSM_esp32.ino:19664` through `SSM_esp32.ino:19671`).
- Boot menu has matching paths: `S` runs `setConfig()` and restarts on success, `B` runs `setBayConfig()`, and `I` runs `setSSMID()` then restarts on success (`SSM_esp32.ino:19996` through `SSM_esp32.ino:20010`).

## Readme Anchors

- ReadmeSSM says setup uses `config.txt` and `Bayconfig.txt`, and boot/config reading was improved (`ReadmeSSM.txt:801`).
- ReadmeSSM notes SSMID is the SSM `authCode`, generated when the site/device is registered in Web (`ReadmeSSM.txt:961` through `ReadmeSSM.txt:963`, `ReadmeSSM.txt:1614` through `ReadmeSSM.txt:1618`).
- ReadmeSSM notes `/config.txt`, `/Bayconfig.txt`, `/Security.txt`, `/Event.txt`, and `/bkEvent.txt` are preserved by keep-set-file format paths (`ReadmeSSM.txt:756` through `ReadmeSSM.txt:761`).

## Diagnostic Signatures

| Signature | Interpretation |
|---|---|
| `authCode : Not Registered` | `/Security.txt` did not provide authCode; SSM may enter `setSSMID()` |
| `cfg saved` / `Baycfg saved` | Loader found missing/invalid fields and rewrote config file |
| `NoCompany is out of range.` | Web `/bayConfig` sent invalid `NoCompany`; current `configBay.NoCompany` remains or defaults on save/load |
| `[Proc-Alarm] ChkBayConfig-Success` then `[Proc_WiFiTx] Req-BayConfig` | Web bay config accepted, persisted, and lower-device refresh requested |
| `CBay[3]` mismatch between SSM and lower logs | Check SSM `/bayConfig` Web response first, then SSM `/Bayconfig.txt`, then lower-device receive/persist path |
