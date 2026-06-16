# SSM source-analysis progress

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## P0

- [x] atlas/ssm/SSM260525-004.yaml - 완료 - 56개 live serialCmd 분기와 AP-mode/runtime HELP/HHELP/THELP 표면을 source line 기준으로 기록. Blocked: none.
- [x] atlas/ssm/notes-log-vocabulary.md - 완료 - 부팅 완료, HELP, INFO/STCOMM/VUPDATE, HTTP/Web, ESP-NOW, 카드/충전, OTA, Event/UniqueID 로그 검색 패턴을 기록. Blocked: none.
- [x] atlas/ssm/notes-source-analysis.md - 완료 - 명령 수, parser site 차이, hidden command, boot-menu, 비활성 기능, Readme 대조, Open Questions 기록. Blocked: none.
- [x] atlas/ssm/notes-reset-triggers.md - 완료 - 활성 ESP.restart/fReset 경로와 비활성 MQTT/HTTPSERVER/commented reset 후보를 분리해 기록. Blocked: none.

## P1

- [x] atlas/flows.md - 완료 - 부팅, 설정 동기화, 사용 시작/종료, 카드 충전, Fault, OTA, 통신 점검, 시간 동기화 흐름과 홉별 키/로그/실패 증상을 기록. Blocked: none.
- [x] atlas/ssm/notes-web-commands.md - 완료 - operationType enum, Socket/Web dispatch, WSRESET body command, and SSM-originated HTTPS endpoint map recorded. Blocked: none.
- [x] atlas/ssm/notes-espnow-protocol.md - 완료 - ESP-NOW setup/send/receive, common JSON keys, CHPLAN/REQRSSI route protocol, ACK/duplicate handling, and ReadmeSSM route anchors recorded. Blocked: none.
- [x] atlas/ssm/notes-ota-lifecycle.md - 완료 - Web/serial OTA commands, admission gates, binary download, lower-device prep/piece/reflash, SSM self-reflash, cleanup and failure signatures recorded. Blocked: none.
- [x] atlas/ssm/notes-fault-codes.md - 완료 - Send_FaultCode payload, C0002/C0003/C0004/C0005/C0006/C0008/S0001 producers, lower-device uFault pass-through, and Readme caveats recorded. Blocked: none.
- [x] atlas/ssm/notes-config-model.md - 완료 - Security/config/Bayconfig files, Config/ConfigBay structures, Web bayConfig mapping, lower-device CBay response, SSMID storage, and manual config paths recorded. Blocked: none.
- [x] atlas/ssm/notes-comm-health.md - 완료 - INFO request/response counters, STCOMM/REQSTCOMM, Web inspection, stale/offline freshness, and C0002 communication-fault confirmation recorded. Blocked: none.
- [x] atlas/ssm/notes-card-charge.md - 완료 - SET_CARD MAC-free queue mode, target-MAC direct mode, Gubun 15/17 payloads, ResRfCtrl terminal handling, /usage reporting, reconnect catch-up, and TTL cleanup recorded. Blocked: none.
- [x] atlas/ssm/notes-event-reliability.md - 완료 - saveEvent/Event.txt/bkEvent retry, missingEvents upload, raw/route/Unique duplicate suppression, route ACK replay, and C0008 event-queue fault handling recorded. Blocked: none.

## P2

- [x] atlas/ssm/notes-time-network.md - 완료 - NTP/RTC setup, INFO RTC/ASK TIME exchange, serial time commands, WiFi/Socket/HTTP health checks, reconnect loop, and C0003/C0004/C0005 network faults recorded. Blocked: none.
- [x] atlas/ssm/notes-peripherals.md - 완료 - LittleFS/SPIFFS, EEPROM, NVS Preferences, RTC, WSCL_RESET, AP-mode FTP/Telnet, and inactive CAN/MQTT/HTTPSERVER/OLED/Serial candidates recorded. Blocked: none.
- [x] atlas/topology.md - 완료 - SSM/Web/Socket.IO/binary-server/lower-device/local-store/AP-mode topology and reliability boundaries recorded. Blocked: none.
- [x] atlas/ssm/discrepancies.md - 완료 - Readme/source and enum/active-branch discrepancies for C0002 threshold, fault payload key, UNIT_PRICE, CMD_TO_WSCL/WSRESET, and SPIFFS/LittleFS naming recorded. Blocked: none.
- [x] atlas/ssm/exploration/2026-06-16-source-analysis/summary.md - 완료 - P0/P1/P2 outputs, key source conclusions, discrepancy list, verification notes, and follow-up boundaries recorded. Blocked: none.

## Stop Criteria

- §8.1 parser mismatch: not triggered.
- §8.2 operationType/ESP-NOW mismatch: not triggered.
- §8.3 P0 too large for one session: not triggered.
- §8.4 original source absent: not triggered.
