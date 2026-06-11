#!/usr/bin/env node
/**
 * package.json 의 version 을 읽어 plugin.json 과 루트 marketplace.json 에 써넣어 동기화한다.
 * npm 의 `version` 라이프사이클 훅에서 호출된다 (cwd = plugins/research-log).
 * package-lock.json 은 npm 이 자동 관리하므로 여기서 손대지 않는다.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pluginPath = path.join(__dirname, '..', '.claude-plugin', 'plugin.json');
const marketplacePath = path.join(__dirname, '..', '..', '..', '.claude-plugin', 'marketplace.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`);
}

const version = readJson(pkgPath).version;
if (!version) {
  console.error('sync-version: package.json 에 version 이 없음');
  process.exit(1);
}

const plugin = readJson(pluginPath);
plugin.version = version;
writeJson(pluginPath, plugin);

const marketplace = readJson(marketplacePath);
const entries = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
const entry = entries.find(item => item && item.name === 'research-log');
if (!entry) {
  console.error('sync-version: marketplace.json 에서 research-log 항목을 찾지 못함');
  process.exit(1);
}
entry.version = version;
writeJson(marketplacePath, marketplace);

console.log(`sync-version: plugin.json, marketplace.json → ${version}`);
