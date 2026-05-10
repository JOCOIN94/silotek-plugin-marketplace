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
  'blank'
]);

const SCALAR_SECTION_KEYS = new Set(['h1', 'h2', 'h3', 'p', 'text', 'code', 'note', 'callout']);

const META_RECOMMENDED_KEYS = ['연구 주제', '연구 단계', '분류', '작성일', '작성자'];
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
  rewriteImages,
  uniqueBasename,
  validateResearchLog,
  formatValidationErrors,
  writeJson,
  writeYaml
};
