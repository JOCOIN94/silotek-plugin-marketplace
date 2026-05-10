#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  analyzeQuality,
  ensureStorage,
  listYaml,
  loadYaml,
  META_RECOMMENDED_KEYS,
  RESEARCH_NATURES
} = require('./common');

const RUBRIC = [
  { area: '메타 정규화', max: 10 },
  { area: '연구 질문 명시', max: 10 },
  { area: '시행착오 밀도', max: 10 },
  { area: '검증 섹션', max: 15 },
  { area: '시각 자료', max: 10 },
  { area: '표 활용', max: 10 },
  { area: '판단의 근거성', max: 10 },
  { area: '향후 과제', max: 5 },
  { area: '안티패턴 회피', max: 5 },
  { area: '성격 일관성', max: 15 }
];

function headingTexts(doc) {
  const out = [];
  for (const el of (doc.sections || [])) {
    if (el && typeof el === 'object' && !Array.isArray(el)) {
      const k = Object.keys(el)[0];
      if (k === 'h1' || k === 'h2' || k === 'h3') {
        if (typeof el[k] === 'string') out.push(el[k]);
      }
    }
  }
  return out;
}

function bodyText(doc) {
  let out = '';
  for (const el of (doc.sections || [])) {
    if (typeof el === 'string') { out += el + ' '; continue; }
    if (!el || typeof el !== 'object') continue;
    const k = Object.keys(el)[0];
    const v = el[k];
    if (typeof v === 'string') out += v + ' ';
    else if (Array.isArray(v)) {
      for (const x of v) if (typeof x === 'string') out += x + ' ';
    }
  }
  return out;
}

function critiqueScore(doc) {
  const meta = (doc && doc.meta) || {};
  const headings = headingTexts(doc);
  const allHeadings = headings.join(' ');
  const body = bodyText(doc);
  const quality = analyzeQuality(doc);
  const stats = quality.stats;

  const breakdown = {};
  const missing = [];
  const suggestions = [];

  // 1. 메타 정규화
  const metaMissing = META_RECOMMENDED_KEYS.filter(k =>
    meta[k] === undefined || meta[k] === null || String(meta[k]).trim() === ''
  );
  const metaScore = Math.max(0, 10 - metaMissing.length * 2);
  breakdown['메타 정규화'] = {
    score: metaScore, max: 10,
    notes: metaMissing.length ? [`누락: ${metaMissing.join(', ')}`] : ['모두 채워짐']
  };
  if (metaMissing.length) {
    missing.push(`메타 정규화 (${metaScore}/10): meta에 ${metaMissing.join(', ')} 누락`);
    suggestions.push(`meta 블록에 ${metaMissing.join(', ')} 추가`);
  }

  // 2. 연구 질문 명시
  const hasResearchQuestion = headings.some(h => /연구 질문|research question/i.test(h));
  const rqScore = hasResearchQuestion ? 10 : 4;
  breakdown['연구 질문 명시'] = {
    score: rqScore, max: 10,
    notes: hasResearchQuestion ? ['"연구 질문" heading 발견'] : ['"연구 질문" heading 없음']
  };
  if (!hasResearchQuestion) {
    missing.push(`연구 질문 명시 (${rqScore}/10): 첫 h1에 "연구 질문" 명시 필요`);
    suggestions.push('첫 섹션 heading을 "1. 연구 질문"으로, 한 줄 답을 적기');
  }

  // 3. 시행착오 밀도
  const hasTrialError = /시행착오|시도|실패|오류|문제/.test(allHeadings);
  const teScore = hasTrialError ? (/실패|오류/.test(body) ? 10 : 6) : 2;
  breakdown['시행착오 밀도'] = {
    score: teScore, max: 10,
    notes: hasTrialError ? ['시행착오 heading 있음'] : ['시행착오 heading 없음']
  };
  if (teScore < 10) {
    missing.push(`시행착오 밀도 (${teScore}/10): 실패 사례와 원인 페어 부족`);
    suggestions.push('"3. 시도와 시행착오" 섹션에 실패 사례 1개 이상 추가');
  }

  // 4. 검증 섹션
  const hasValidation = /검증|실험|비교|측정|평가/.test(allHeadings);
  const hasQuant = /\d+\s*(개|건|회|명|ms|s|MB|KB|%)/.test(body);
  const valScore = hasValidation ? (hasQuant ? 15 : 9) : 4;
  breakdown['검증 섹션'] = {
    score: valScore, max: 15,
    notes: [
      hasValidation ? '검증 heading 있음' : '검증 heading 없음',
      hasQuant ? '정량 근거 발견' : '정량 근거 없음'
    ]
  };
  if (valScore < 15) {
    missing.push(`검증 섹션 (${valScore}/15): ${!hasValidation ? '검증 heading 누락' : '정량 근거 부족'}`);
    suggestions.push('"6. 검증" 섹션에 측정값/비교표 추가');
  }

  // 5. 시각 자료
  const visualCount = stats.imageCount + stats.visualBriefCount;
  const visScore = visualCount === 0 ? 0 : visualCount === 1 ? 6 : 10;
  breakdown['시각 자료'] = {
    score: visScore, max: 10,
    notes: [`image ${stats.imageCount}개, visual_brief ${stats.visualBriefCount}개`]
  };
  if (visScore < 10) {
    missing.push(`시각 자료 (${visScore}/10): image+visual_brief 합 ${visualCount}개`);
    suggestions.push('visual_brief를 추가하고 research-diagrammer에 위임');
  }

  // 6. 표 활용
  const tabScore = stats.tableCount === 0 ? 0 : stats.tableCount === 1 ? 7 : 10;
  breakdown['표 활용'] = {
    score: tabScore, max: 10,
    notes: [`table ${stats.tableCount}개`]
  };
  if (tabScore < 10) {
    missing.push(`표 활용 (${tabScore}/10): 표 ${stats.tableCount}개`);
    suggestions.push('비교/요약 표를 1개 이상 추가');
  }

  // 7. 판단의 근거성
  const antiPatternHit = quality.warnings.some(w => w.code === 'FOLDER_EXPLORATION_ANTI_PATTERN');
  const lengthOk = stats.textLength >= 800;
  const judgScore = (antiPatternHit ? 0 : 5) + (lengthOk ? 5 : 0);
  breakdown['판단의 근거성'] = {
    score: judgScore, max: 10,
    notes: [
      antiPatternHit ? '안티패턴 발견' : '안티패턴 없음',
      `본문 ${stats.textLength}자`
    ]
  };
  if (judgScore < 10) {
    missing.push(`판단의 근거성 (${judgScore}/10): ${antiPatternHit ? '안티패턴 발견' : '본문 짧음'}`);
    if (!lengthOk) suggestions.push(`본문을 800자 이상으로 늘리기 (현재 ${stats.textLength})`);
  }

  // 8. 향후 과제
  const hasFuture = /남은|향후|한계|불확실|추후/.test(allHeadings);
  const fwScore = hasFuture ? 5 : 1;
  breakdown['향후 과제'] = {
    score: fwScore, max: 5,
    notes: [hasFuture ? '향후 heading 있음' : '향후 heading 없음']
  };
  if (fwScore < 5) {
    missing.push(`향후 과제 (${fwScore}/5): "8. 향후 과제" heading 누락`);
    suggestions.push('마지막 섹션에 "향후 과제" heading + 남은 질문 한 줄');
  }

  // 9. 안티패턴 회피
  const apAvoid = antiPatternHit ? 0 : 5;
  breakdown['안티패턴 회피'] = {
    score: apAvoid, max: 5,
    notes: [antiPatternHit ? '폴더 탐구형 키워드 다수' : '안티패턴 없음']
  };
  if (apAvoid < 5) {
    missing.push(`안티패턴 회피 (${apAvoid}/5): 폴더 탐구형 키워드 다수`);
    suggestions.push('"단순히", "구조를 살펴본다" 표현 제거');
  }

  // 10. 성격 일관성
  const nature = meta['연구 성격'];
  let natScore;
  let natNotes = [];
  if (!nature || !RESEARCH_NATURES.includes(String(nature).trim())) {
    natScore = 0;
    natNotes = [`meta.연구 성격이 ${RESEARCH_NATURES.join('/')} 중 하나가 아님 (현재: ${nature || '비어있음'})`];
  } else {
    const matchKeywords = {
      '구축': /시행착오|시도|단계|구현|구축|만들/,
      '분석': /현황|구조|원인|분석/,
      '검증': /가설|실험|측정|검증/
    };
    const re = matchKeywords[String(nature).trim()];
    if (re && re.test(allHeadings)) {
      natScore = 15;
      natNotes = [`'${nature}' 성격과 본문 강조점 일치`];
    } else {
      natScore = 7;
      natNotes = [`'${nature}' 성격이지만 본문 heading에 그 성격의 키워드가 약함`];
    }
  }
  breakdown['성격 일관성'] = { score: natScore, max: 15, notes: natNotes };
  if (natScore < 15) {
    missing.push(`성격 일관성 (${natScore}/15): ${natNotes[0]}`);
    suggestions.push('meta.연구 성격에 맞춰 heading 키워드를 강화하거나 성격을 정정');
  }

  const total = Object.values(breakdown).reduce((s, b) => s + b.score, 0);
  return { total, breakdown, missing, suggestions };
}

function formatReport(result, basename) {
  const lines = [];
  lines.push('');
  lines.push(`점수: ${result.total} / 100${basename ? `  (${basename})` : ''}`);
  lines.push('');
  lines.push('영역별:');
  for (const [area, b] of Object.entries(result.breakdown)) {
    const note = b.notes && b.notes.length ? b.notes.join('; ') : '';
    lines.push(`  - ${area}: ${b.score}/${b.max} — ${note}`);
  }
  if (result.missing.length) {
    lines.push('');
    lines.push('부족 항목:');
    for (const m of result.missing) lines.push(`  - ${m}`);
  }
  if (result.suggestions.length) {
    lines.push('');
    lines.push('수정 제안:');
    for (const s of result.suggestions) lines.push(`  - ${s}`);
  }
  return lines.join('\n');
}

function resolveYaml(selector, storage) {
  const entries = listYaml(storage);
  if (/^\d+$/.test(selector)) {
    const e = entries[Number(selector) - 1];
    if (!e) throw new Error(`목록 번호가 범위를 벗어남: ${selector}`);
    return e;
  }
  const direct = path.resolve(selector);
  if (fs.existsSync(direct)) {
    return { basename: path.basename(direct, path.extname(direct)), inputPath: direct };
  }
  const inCentral = path.join(storage.inputs, selector.endsWith('.yaml') ? selector : `${selector}.yaml`);
  if (fs.existsSync(inCentral)) {
    return { basename: path.basename(inCentral, path.extname(inCentral)), inputPath: inCentral };
  }
  throw new Error(`YAML을 찾을 수 없음: ${selector}`);
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const filtered = args.filter(a => a !== '--json');
  if (!filtered.length || filtered.includes('--help') || filtered.includes('-h')) {
    console.log('사용법: node scripts/critique.js <yaml-id-or-path> [--json]');
    process.exit(filtered.length ? 0 : 1);
  }
  const storage = ensureStorage();
  const target = resolveYaml(filtered[0], storage);
  const doc = loadYaml(target.inputPath);
  const result = critiqueScore(doc);
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatReport(result, target.basename));
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`✗ 채점 실패: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { critiqueScore, formatReport };
