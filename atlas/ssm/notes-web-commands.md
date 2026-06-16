# SSM Web Command Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This note maps Web-facing command surfaces visible in source only. It separates Socket.IO/Web JSON command dispatch from SSM-originated HTTPS calls. It does not assert deployed Web/backend behavior beyond the firmware source.

## OperationType Enum

`OperationType` is defined in `SSM_esp32.h:696` through `SSM_esp32.h:717`.

| Value | Symbol | Source role |
|---:|---|---|
| 1 | `SSM_TEST` | Local SSM site-test ACK path |
| 2 | `APU_TEST` | Lower-device UTEST command |
| 3 | `VOLUME` | Lower-device volume command |
| 4 | `POWER` | Lower-device power command |
| 5 | `INSPECTION_MODE` | SSM inspection/communication test |
| 6 | `UNIT_PRICE` | Enum remains, but direct branch is inside a block-commented replacement section |
| 7 | `WASH_START` | Web start command |
| 8 | `WASH_END` | Web stop command |
| 9 | `COIN_DEVICE` | Coin count command |
| 10 | `OPER_FUNCTION` | Base for operationType 10 through 19 function-control commands |
| 20 | `REQ_UNITPRICE` | Request unit-price refresh |
| 21 | `REQ_ADJUSTUNITTIME` | Request charge-type/adjusted-unit-time refresh |
| 22 | `SET_CARD` | RF card control / charge command |
| 23 | `REQ_BAYCONFIG` | Request bay config refresh |
| 24 | `REQ_SSMID` | Request SSM ID/init refresh |
| 25 | `SETBAY_OPERMODE` | Push bay operation-mode/config to target lower device |
| 500 | `CMD_TO_WSCL` | Enum comment says SSM does not actually use it; active WSCL reset path uses `WSRESET`, not operationType 500 |

## Socket/Web Dispatch Map

The active Web dispatch reads `jsonWebSendBuf["operationType"].as<int>()` in the Socket/Web message handler. A MAC-free `SET_CARD` path is handled before target-MAC dispatch (`SSM_esp32.ino:12899` through `SSM_esp32.ino:12954`). MAC-targeted commands require one of `mac`, `macAddress`, or `macAdress` and map the target to an internal `MacMatchingBufIndex` (`SSM_esp32.ino:12956` through `SSM_esp32.ino:13006`).

| operationType | Active condition | SSM -> lower-device payload/action | Web response behavior | Source anchors |
|---:|---|---|---|---|
| 22 | No `mac`/`macAddress`/`macAdress` | Queue by `CuID` with `EnqueueCharge()`, broadcast pending charge to available SB devices | Sets `fOKRev`, `data_rev_flag = 4`, returns without target-MAC send | `SSM_esp32.ino:12899` through `SSM_esp32.ino:12954` |
| 9 | Target MAC present | `Gubun = "12"`, `Coin`, optional `tsKey`, `Ssn`, then `WriteWiFiTxBuffer()` | General OK path with `data_rev_flag = 4` | `SSM_esp32.ino:13018` through `SSM_esp32.ino:13043` |
| 2 | Target MAC present | `UTEST = "1"`, `Ssn`, `WriteWiFiTxBuffer()` and immediate command flag | Sets `Done = "NOK"` initially and uses `data_rev_flag = 2` wait path | `SSM_esp32.ino:13046` through `SSM_esp32.ino:13079` |
| 3 | Target MAC present | `Volume` field is filled in `jsonWiFiSendBuf` | `data_rev_flag = 3`; this branch does not serialize/send in the local branch body | `SSM_esp32.ino:13081` through `SSM_esp32.ino:13088` |
| 4 | Target MAC present | `Power`, then direct `sendMessage(WiFiMsg)` | General OK path with `data_rev_flag = 4` | `SSM_esp32.ino:13089` through `SSM_esp32.ino:13107` |
| 7 | Target MAC present | `aOrder = "1"`, optional `tAmt`, `tTime`, `uID`, `tsKey`, `Ssn`, and `WriteWiFiTxBuffer()` | General OK path with `data_rev_flag = 4` | `SSM_esp32.ino:13109` through `SSM_esp32.ino:13211` |
| 8 | Target MAC present | `aOrder = "0"`, optional `uID`, `tsKey`, `Ssn`, and `WriteWiFiTxBuffer()` | General OK path with `data_rev_flag = 4` | `SSM_esp32.ino:13221` through `SSM_esp32.ino:13261` |
| 10..19 | Target MAC present | `Gubun = "14"`, `CtrlFunc = operationType`, optional `uID`, `tsKey`, `Ssn`, and `WriteWiFiTxBuffer()` | General OK path with `data_rev_flag = 4` | `SSM_esp32.ino:13272` through `SSM_esp32.ino:13305` |
| 25 | Target MAC present and valid `bayMode` | `Gubun = "16"`, `bayMode`, `cfgIdr`, optional `usFut`, `TPerS`, `uID`, `tsKey`, `Ssn`, and `WriteWiFiTxBuffer()` | Invalid/missing mode returns `Done = "NOK"` with reason; valid path uses lower-device buffer | `SSM_esp32.ino:13308` through `SSM_esp32.ino:13478` |
| 22 | Target MAC present | `Gubun = "15"`, `rfCard`, optional `points`, `uID`, `tsKey`, `CuID`, `Ssn`, and direct `WriteWiFiTxBuffer()` | `points == 0` skips; target-MAC path deliberately does not enqueue | `SSM_esp32.ino:13481` through `SSM_esp32.ino:13573` |
| 1 | No target MAC branch | Local SSM ACK/test only | General OK path with `data_rev_flag = 4` | `SSM_esp32.ino:13605` through `SSM_esp32.ino:13612` |
| 5 | No target MAC branch | Starts inspection if not already inspecting, fault-checking, or OTA updating; calls `ReqInfoTo(true)` and `WrInfoBuffer("AllClrBufferAboutInspect")` | `Done = "OK"` or `Done = "NOK"` in Web response body | `SSM_esp32.ino:13613` through `SSM_esp32.ino:13658` |
| 20 | No target MAC branch | Clears unit-price request counter and invalidates cached unit-price type | General OK path with `data_rev_flag = 4` | `SSM_esp32.ino:13660` through `SSM_esp32.ino:13672` |
| 21 | No target MAC branch | Clears adjusted-unit-time request counter and sets `fReqAdjUnit = true` | General OK path with `data_rev_flag = 4` | `SSM_esp32.ino:13673` through `SSM_esp32.ino:13685` |
| 23 | No target MAC branch | Clears bay-config request counter and marks bay config not yet set | General OK path with `data_rev_flag = 4` | `SSM_esp32.ino:13686` through `SSM_esp32.ino:13698` |
| 24 | No target MAC branch | Sets `fReq_Init = true` and resets `ReqMacTime` | General OK path with `data_rev_flag = 4` | `SSM_esp32.ino:13699` through `SSM_esp32.ino:13708` |

## Non-OperationType Web Body Command

`WSRESET` is handled from the received Web message body independently from `operationType`: if `msgBody["WSRESET"].as<int>() == 1`, SSM prints `*** WSCL HW Reset...`, pulls `WSCL_RESET` low for 500 ms, then drives it high (`SSM_esp32.ino:15071` through `SSM_esp32.ino:15077`). This is the active WSCL reset surface in the current source; it is not the enum value `CMD_TO_WSCL = 500`.

## HTTPS Calls Originated By SSM

| Function / flow | Endpoint | Payload highlights | Source anchors |
|---|---|---|---|
| `Req_Init()` | `https://device.silotek.co.kr/init` | `authCode` | `SSM_esp32.ino:3139` through `SSM_esp32.ino:3144` |
| `Req_PriceInfo()` | `https://device.silotek.co.kr/unitPrice` | `authCode` | `SSM_esp32.ino:3149` through `SSM_esp32.ino:3160` |
| `Req_BayConfig()` | `https://device.silotek.co.kr/bayConfig` | `authCode` | `SSM_esp32.ino:3165` through `SSM_esp32.ino:3176` |
| `Req_AdjUnitTimeInfo()` | `https://device.silotek.co.kr/unitPriceByTypeOfCharge` | `authCode` | `SSM_esp32.ino:3181` through `SSM_esp32.ino:3192` |
| `Send_InspectResult()` | `https://device.silotek.co.kr/device/{SSMdeviceId}/inspect` | `Inspect[pos] = [mac, rateComm, avrInspcntTakentime]` | `SSM_esp32.ino:3197` through `SSM_esp32.ino:3273` |
| `Send_JsonFile()` | `https://device.silotek.co.kr/device/{SSMdeviceId}/setup` | Serialized setup JSON read from SPIFFS | `SSM_esp32.ino:3279` through `SSM_esp32.ino:3315` |
| `Send_statusOfDownload()` | `/device/{deviceId}/download/done` | `authCode`, `chipType`, `done` | `SSM_esp32.ino:3320` through `SSM_esp32.ino:3370` |
| `Send_statusOfReflash()` | `/device/{deviceId}/reflash/done` | `authCode`, `chipType`, `done` | `SSM_esp32.ino:3375` through `SSM_esp32.ino:3425` |
| `Send_EndOfDownloadFromWebToSSM()` | `https://device.silotek.co.kr/device/{SSMdeviceId}/sharing` | `authCode`, `sharing` | `SSM_esp32.ino:3431` through `SSM_esp32.ino:3465` |
| `Send_msg()` | `/device/{deviceId}/version` | `authCode`, `chipType`, `tag`, optional `UTC` | `SSM_esp32.ino:3471` through `SSM_esp32.ino:3536` |
| `Send_FaultCode()` | `https://device.silotek.co.kr/fault` | `macAddress`, `authCode`, optional `userId`, `userTransactionId`, `faultCode`, `reason`, `message`, optional `UTC` | `SSM_esp32.ino:3541` through `SSM_esp32.ino:3596` |
| `Send_Operation()` | `https://device.silotek.co.kr/usage` | usage/event data including `macAddress`, `userId`, `userTransactionId`, `functionId`, `usageTime`, `coin`, `remainingPoint`, RF fields, `uniqueNo`, `cidx`, optional `UTC` | `SSM_esp32.ino:3601` through `SSM_esp32.ino:3706` |

## Exclusions And Caveats

- `UNIT_PRICE = 6` remains in the enum, but the direct branch for `operationType == UNIT_PRICE` is inside a block-commented region that says it was replaced by protocol 18 / `REQ_UNITPRICE` (`SSM_esp32.ino:13575` through `SSM_esp32.ino:13604`).
- `CMD_TO_WSCL = 500` remains in the enum with a comment that SSM does not use it; current active WSCL reset is `WSRESET` in the message body (`SSM_esp32.h:716`, `SSM_esp32.ino:15071`).
- The source accepts both `macAddress` and misspelled `macAdress` in addition to `mac` for target selection (`SSM_esp32.ino:12956` through `SSM_esp32.ino:12970`).
- This note does not claim backend schemas, deployed Socket.IO event names, or Web UI labels. It records only fields and endpoints visible in firmware source.
