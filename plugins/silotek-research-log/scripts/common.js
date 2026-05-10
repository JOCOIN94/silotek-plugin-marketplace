const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const STORAGE_DIRS = ['inputs', 'outputs', 'manifests', 'figures'];
const SECTION_ELEMENT_KEYS = new Set([
  'h1',
  'h2',
  'h3',
  'p',
  'text',
  'bullets',
  'numbers',
  'ordered',
  'code',
  'image',
  'table',
  'note',
  'callout',
  'spacer',
  'blank',
  'visual_brief'
]);

const SCALAR_SECTION_KEYS = new Set(['h1', 'h2', 'h3', 'p', 'text', 'code', 'note', 'callout']);

const META_RECOMMENDED_KEYS = ['연구 주제', '연구 성격', '연구 단계', '분류', '작성일', '작성자'];
const RESEARCH_NATURES = ['구축', '분석', '검증'];
const FORBIDDEN_TOP_LEVEL_KEYS = ['project', 'date', 'authors', 'keywords', 'category'];

function pluginRoot() {
  return path.resolve(__dirname, '..');
}

function researchRoot() {
  return process.env.SILOTEK_RESEARCH_LOG_ROOT
    ? path.resolve(process.env.SILOTEK_RESEARCH_LOG_ROOT)
    : path.join(os.homedir(), 'Documents', 'Silotek Research Logs');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function ensureStorage(root = researchRoot()) {
  ensureDir(root);
  for (const dir of STORAGE_DIRS) {
    ensureDir(path.join(root, dir));
  }

  const bundledLogo = path.join(pluginRoot(), 'assets', 'logo_silotek.png');
  const centralLogo = path.join(root, 'figures', 'logo_silotek.png');
  if (fs.existsSync(bundledLogo) && !fs.existsSync(centralLogo)) {
    fs.copyFileSync(bundledLogo, centralLogo);
  }

  return {
    root,
    inputs: path.join(root, 'inputs'),
    outputs: path.join(root, 'outputs'),
    manifests: path.join(root, 'manifests'),
    figures: path.join(root, 'figures')
  };
}

function loadYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function writeYaml(filePath, data) {
  fs.writeFileSync(filePath, yaml.dump(data, {
    lineWidth: 120,
    noRefs: true,
    sortKeys: false
  }), 'utf8');
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateResearchLog(doc) {
  const errors = [];

  if (!isPlainObject(doc)) {
    return ['YAML 최상위 값은 객체여야 합니다.'];
  }

  for (const forbidden of FORBIDDEN_TOP_LEVEL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(doc, forbidden)) {
      errors.push(`top-level "${forbidden}" 키는 사용하지 마세요. meta 객체 안으로 옮기고 한국어 키(예: "연구 주제", "작성일", "작성자", "분류")로 적어주세요.`);
    }
  }

  if (doc.title !== undefined && typeof doc.title !== 'string') {
    errors.push('title은 문자열이어야 합니다.');
  }

  if (doc.subtitle !== undefined && typeof doc.subtitle !== 'string') {
    errors.push('subtitle은 문자열이어야 합니다.');
  }

  if (doc.meta !== undefined && !isPlainObject(doc.meta)) {
    errors.push('meta는 객체여야 합니다.');
  }

  if (!Array.isArray(doc.sections)) {
    errors.push('sections 배열이 필요합니다.');
    return errors;
  }

  doc.sections.forEach((element, index) => {
    const label = `sections[${index}]`;

    if (typeof element === 'string') return;

    if (!isPlainObject(element)) {
      errors.push(`${label}은 문자열 또는 단일 키 객체여야 합니다.`);
      return;
    }

    const keys = Object.keys(element);
    if (keys.length !== 1) {
      errors.push(`${label}은 렌더링 요소 하나만 포함해야 합니다. 예: '- h1: "1. 제목"' 뒤에 '- p: "본문"'을 별도 항목으로 작성하세요.`);
    }

    for (const key of keys) {
      if (!SECTION_ELEMENT_KEYS.has(key)) {
        errors.push(`${label}에 지원하지 않는 키 "${key}"가 있습니다. heading/body/paragraph/list/content/items 구조를 쓰지 말고 h1, h2, h3, p, bullets, numbers, code, image, table, note, spacer 중 하나를 사용하세요.`);
        continue;
      }

      const value = element[key];
      if (SCALAR_SECTION_KEYS.has(key) && typeof value !== 'string') {
        errors.push(`${label}.${key} 값은 문자열이어야 합니다.`);
      } else if ((key === 'bullets' || key === 'numbers' || key === 'ordered') && !Array.isArray(value)) {
        errors.push(`${label}.${key} 값은 배열이어야 합니다.`);
      } else if (key === 'image' && !isPlainObject(value)) {
        errors.push(`${label}.image 값은 path/caption/width를 담은 객체여야 합니다.`);
      } else if (key === 'table' && !isPlainObject(value)) {
        errors.push(`${label}.table 값은 headers/rows를 담은 객체여야 합니다.`);
      } else if (key === 'visual_brief') {
        if (!isPlainObject(value)) {
          errors.push(`${label}.visual_brief 값은 purpose/claim/evidence/forbidden/palette/caption을 담은 객체여야 합니다.`);
        } else {
          for (const fld of ['purpose', 'claim', 'palette', 'caption']) {
            if (typeof value[fld] !== 'string' || value[fld].trim() === '') {
              errors.push(`${label}.visual_brief.${fld}는 비어있지 않은 문자열이어야 합니다.`);
            }
          }
          for (const fld of ['evidence', 'forbidden']) {
            if (!Array.isArray(value[fld]) || value[fld].length === 0) {
              errors.push(`${label}.visual_brief.${fld}는 비어있지 않은 배열이어야 합니다.`);
            } else if (!value[fld].every(item => typeof item === 'string')) {
              errors.push(`${label}.visual_brief.${fld}의 모든 항목은 문자열이어야 합니다.`);
            }
          }
        }
      }
    }
  });

  return errors;
}

function formatValidationErrors(errors) {
  const maxShown = 12;
  const shown = errors.slice(0, maxShown);
  const hiddenCount = errors.length - shown.length;
  return [
    'YAML schema error:',
    ...shown.map(error => `- ${error}`),
    ...(hiddenCount > 0 ? [`- ... ${hiddenCount}개 추가 오류 생략`] : []),
    '',
    '허용되는 flat section 형식:',
    'sections:',
    '  - h1: "1. 제목"',
    '  - p: "본문"',
    '  - h2: "1.1 세부 제목"',
    '  - bullets:',
    '      - "항목"',
    '',
    '금지 형식:',
    'sections:',
    '  - heading: "1. 제목"',
    '    body: "본문"'
  ].join('\n');
}

function collectSectionStats(doc) {
  const stats = {
    sectionCount: 0,
    headingCount: 0,
    imageCount: 0,
    tableCount: 0,
    visualBriefCount: 0,
    textLength: 0
  };
  if (!Array.isArray(doc.sections)) return stats;
  for (const element of doc.sections) {
    stats.sectionCount += 1;
    if (typeof element === 'string') {
      stats.textLength += element.length;
      continue;
    }
    if (!isPlainObject(element)) continue;
    const [key] = Object.keys(element);
    const value = element[key];
    if (key === 'h1' || key === 'h2' || key === 'h3') {
      stats.headingCount += 1;
      if (typeof value === 'string') stats.textLength += value.length;
    } else if (key === 'p' || key === 'text' || key === 'note' || key === 'callout' || key === 'code') {
      if (typeof value === 'string') stats.textLength += value.length;
    } else if (key === 'bullets' || key === 'numbers' || key === 'ordered') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') stats.textLength += item.length;
        }
      }
    } else if (key === 'image') {
      stats.imageCount += 1;
    } else if (key === 'table') {
      stats.tableCount += 1;
    } else if (key === 'visual_brief') {
      stats.visualBriefCount += 1;
    }
  }
  return stats;
}

function analyzeQuality(doc, options = {}) {
  const errors = [];
  const warnings = [];
  const stats = collectSectionStats(doc || {});

  // META_MISSING_KEY 검사
  const meta = (doc && doc.meta) || {};
  for (const key of META_RECOMMENDED_KEYS) {
    const value = meta[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      warnings.push({
        code: 'META_MISSING_KEY',
        message: `meta.${key}가 비어 있습니다. 권장 메타 ${META_RECOMMENDED_KEYS.length}개(${META_RECOMMENDED_KEYS.join(', ')})를 모두 채우는 것을 권장합니다.`,
        detail: { key }
      });
    }
  }

  // META_INVALID_VALUE 검사 — 도메인 강제 키들
  if (meta['연구 성격'] !== undefined && meta['연구 성격'] !== null && String(meta['연구 성격']).trim() !== '') {
    const value = String(meta['연구 성격']).trim();
    if (!RESEARCH_NATURES.includes(value)) {
      warnings.push({
        code: 'META_INVALID_VALUE',
        message: `meta.연구 성격은 ${RESEARCH_NATURES.join(' / ')} 중 하나여야 합니다 (현재: "${value}").`,
        detail: { key: '연구 성격', value, allowed: RESEARCH_NATURES.slice() }
      });
    }
  }

  const KEYWORD_GROUPS = {
    NO_VALIDATION_SECTION: {
      keywords: ['검증', '실험', '비교', '측정', '평가', '결과'],
      label: '검증/실험/비교/측정'
    },
    NO_TRIAL_ERROR_SECTION: {
      keywords: ['시행착오', '실패', '문제', '오류', '재시도', '에러'],
      label: '시행착오/실패/문제/오류'
    },
    NO_FUTURE_WORK_SECTION: {
      keywords: ['남은', '향후', '한계', '불확실', '추후'],
      label: '남은/향후/한계/불확실'
    }
  };

  const headingTexts = [];
  for (const element of (doc.sections || [])) {
    if (!isPlainObject(element)) continue;
    const [key] = Object.keys(element);
    if (key === 'h1' || key === 'h2' || key === 'h3') {
      const value = element[key];
      if (typeof value === 'string') headingTexts.push(value);
    }
  }
  const allHeadings = headingTexts.join(' ');

  for (const [code, group] of Object.entries(KEYWORD_GROUPS)) {
    const found = group.keywords.some(kw => allHeadings.includes(kw));
    if (!found) {
      warnings.push({
        code,
        message: `'${group.label}' 중 하나가 들어간 섹션 제목이 보이지 않습니다. 연구일지 흐름을 갖추는 것을 권장합니다.`,
        detail: { keywords: group.keywords }
      });
    }
  }

  // 정량 검사
  if (stats.imageCount === 0) {
    warnings.push({
      code: 'NO_IMAGES',
      message: '이미지가 0개입니다. 연구 산출물형 문서는 시각 자료를 1개 이상 두는 것을 권장합니다.',
      detail: {}
    });
  }
  if (stats.imageCount === 0 && stats.visualBriefCount === 0) {
    warnings.push({
      code: 'NO_VISUAL_BRIEF',
      message: '이미지와 visual_brief가 모두 0개입니다. 시각 자료가 필요한 자리에 visual_brief element를 미리 두는 것을 강하게 권장합니다.',
      detail: { imageCount: stats.imageCount, visualBriefCount: stats.visualBriefCount }
    });
  }
  if (stats.tableCount === 0) {
    warnings.push({
      code: 'NO_TABLES',
      message: '표가 하나도 없습니다. 비교/요약 표를 1개 이상 두는 것을 권장합니다.',
      detail: {}
    });
  }
  if (stats.textLength < 800) {
    warnings.push({
      code: 'TEXT_TOO_SHORT',
      message: `본문 텍스트가 ${stats.textLength}자입니다. 800자 이상으로 작성하는 것을 권장합니다.`,
      detail: { textLength: stats.textLength, threshold: 800 }
    });
  }

  // 안티패턴 검사
  const ANTI_PATTERN_PHRASES = [
    '단순히', '구조를 살펴본다', '구조를 살펴보면',
    '디렉터리 구조를 정리', '폴더 구조를 정리'
  ];
  let bodyText = '';
  for (const element of (doc.sections || [])) {
    if (typeof element === 'string') {
      bodyText += element + ' ';
    } else if (isPlainObject(element)) {
      const [key] = Object.keys(element);
      const value = element[key];
      if (typeof value === 'string') bodyText += value + ' ';
      else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') bodyText += item + ' ';
        }
      }
    }
  }
  let antiPatternHits = 0;
  for (const phrase of ANTI_PATTERN_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = bodyText.match(re);
    if (matches) antiPatternHits += matches.length;
  }
  if (antiPatternHits >= 2) {
    warnings.push({
      code: 'FOLDER_EXPLORATION_ANTI_PATTERN',
      message: `폴더 탐구형 키워드(${ANTI_PATTERN_PHRASES.join(', ')})가 ${antiPatternHits}회 등장합니다. 연구 질문 중심으로 본문을 다시 짜는 것을 권장합니다.`,
      detail: { hits: antiPatternHits, threshold: 2 }
    });
  }

  // 이미지 파일 존재성 검사
  if (options.draftDir) {
    for (const element of (doc.sections || [])) {
      if (!isPlainObject(element) || !element.image || !element.image.path) continue;
      const resolved = resolveImagePath(
        String(element.image.path),
        options.draftDir,
        options.sourceRoot || null
      );
      if (!resolved) {
        warnings.push({
          code: 'IMAGE_FILE_MISSING',
          message: `image element가 가리키는 파일을 찾을 수 없습니다: ${element.image.path}`,
          detail: { path: element.image.path }
        });
      }
    }
  }

  return { errors, warnings, stats };
}

function dateStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateFromMeta(doc) {
  const raw = doc && doc.meta && (doc.meta['작성일'] || doc.meta.date || doc.meta.Date);
  if (!raw) return dateStamp();
  const text = String(raw);
  const iso = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const ko = text.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (ko) return `${ko[1]}-${ko[2].padStart(2, '0')}-${ko[3].padStart(2, '0')}`;
  return dateStamp();
}

function slugify(value) {
  return String(value || 'research-log')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'research-log';
}

function basenameFromDoc(doc, explicitSlug) {
  const date = dateFromMeta(doc);
  const topic = explicitSlug
    || doc.subtitle
    || (doc.meta && doc.meta['연구 주제'])
    || doc.title
    || 'research-log';
  const slug = slugify(topic);
  return slug.startsWith(`${date}-`) ? slug : `${date}-${slug}`;
}

function uniqueBasename(storage, basename) {
  let candidate = basename;
  let index = 2;
  while (
    fs.existsSync(path.join(storage.inputs, `${candidate}.yaml`)) ||
    fs.existsSync(path.join(storage.outputs, `${candidate}.docx`)) ||
    fs.existsSync(path.join(storage.manifests, `${candidate}.json`))
  ) {
    candidate = `${basename}-${index}`;
    index += 1;
  }
  return candidate;
}

function listYaml(storage = ensureStorage()) {
  if (!fs.existsSync(storage.inputs)) return [];
  return fs.readdirSync(storage.inputs)
    .filter(name => name.toLowerCase().endsWith('.yaml') || name.toLowerCase().endsWith('.yml'))
    .sort()
    .map((name, index) => {
      const inputPath = path.join(storage.inputs, name);
      let doc = {};
      try {
        doc = loadYaml(inputPath) || {};
      } catch (error) {
        doc = { title: '[YAML 파싱 실패]', subtitle: error.message, meta: {} };
      }
      const basename = path.basename(name, path.extname(name));
      const outputPath = path.join(storage.outputs, `${basename}.docx`);
      return {
        index: index + 1,
        basename,
        name,
        inputPath,
        outputPath,
        hasDocx: fs.existsSync(outputPath),
        title: doc.title || '',
        subtitle: doc.subtitle || '',
        date: doc.meta && doc.meta['작성일'] ? String(doc.meta['작성일']) : ''
      };
    });
}

function uniqueFilePath(dir, originalName) {
  const ext = path.extname(originalName);
  const base = slugify(path.basename(originalName, ext));
  let candidate = `${base}${ext.toLowerCase()}`;
  let index = 2;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base}-${index}${ext.toLowerCase()}`;
    index += 1;
  }
  return path.join(dir, candidate);
}

function resolveImagePath(imagePath, draftDir, sourceRoot) {
  if (!imagePath) return null;
  const candidates = [];
  if (path.isAbsolute(imagePath)) candidates.push(imagePath);
  candidates.push(path.resolve(draftDir, imagePath));
  if (sourceRoot) candidates.push(path.resolve(sourceRoot, imagePath));
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function rewriteImages(doc, options) {
  const { draftDir, sourceRoot, storage, basename } = options;
  const targetDir = path.join(storage.figures, basename);
  ensureDir(targetDir);
  const copied = [];

  for (const element of doc.sections || []) {
    if (!element || typeof element !== 'object' || !element.image || !element.image.path) continue;
    const sourcePath = resolveImagePath(String(element.image.path), draftDir, sourceRoot);
    if (!sourcePath) continue;
    const targetPath = uniqueFilePath(targetDir, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, targetPath);
    element.image.path = path.join('..', 'figures', basename, path.basename(targetPath)).replace(/\\/g, '/');
    copied.push({ sourcePath, storedPath: targetPath, caption: element.image.caption || '' });
  }

  return copied;
}

module.exports = {
  analyzeQuality,
  basenameFromDoc,
  dateStamp,
  ensureStorage,
  FORBIDDEN_TOP_LEVEL_KEYS,
  listYaml,
  loadYaml,
  META_RECOMMENDED_KEYS,
  pluginRoot,
  readJsonIfExists,
  researchRoot,
  RESEARCH_NATURES,
  rewriteImages,
  uniqueBasename,
  validateResearchLog,
  formatValidationErrors,
  writeJson,
  writeYaml
};
