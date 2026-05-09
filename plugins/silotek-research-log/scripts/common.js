const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const STORAGE_DIRS = ['inputs', 'outputs', 'manifests', 'figures'];

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
  listYaml,
  loadYaml,
  pluginRoot,
  readJsonIfExists,
  researchRoot,
  rewriteImages,
  uniqueBasename,
  writeJson,
  writeYaml
};
