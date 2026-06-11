#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { assertInsideStorage, ensureStorage } = require('./common');

const UNSAFE_PATTERNS = [
  /<script\b/i,
  /<foreignObject\b/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /\son[a-z]+\s*=/i,
  /javascript:/i,
  /\b(?:href|src|xlink:href)\s*=\s*["']https?:\/\//i,
  /url\(\s*["']?https?:\/\//i
];

function usage() {
  console.log(`Rasterize one inline SVG from an HTML file.

Usage:
  node scripts/rasterize-svg.js <input.html> <output.png> [--width <px>]

Default width: 1152px
`);
}

function parseArgs(argv) {
  const args = { width: 1152 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--width') args.width = Number(argv[++i]);
    else if (!args.input) args.input = arg;
    else if (!args.output) args.output = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isFinite(args.width) || args.width < 64 || args.width > 6000) {
    throw new Error('--width must be a number between 64 and 6000');
  }
  return args;
}

function assertSupportedMarkup(markup) {
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(markup)) {
      throw new Error(`Unsupported or unsafe SVG/HTML content matched ${pattern}`);
    }
  }
}

function extractSvgFromHtml(html) {
  assertSupportedMarkup(html);
  const matches = html.match(/<svg\b[\s\S]*?<\/svg>/gi) || [];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one inline SVG, found ${matches.length}`);
  }

  let svg = matches[0];
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map(match => match[1].trim())
    .filter(Boolean);

  if (!/\sxmlns=/.test(svg.slice(0, svg.indexOf('>') + 1))) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (styles.length) {
    svg = svg.replace(/(<svg\b[^>]*>)/i, `$1<style>${styles.join('\n')}</style>`);
  }

  return applyFontFallbacks(svg);
}

function applyFontFallbacks(svg) {
  let result = svg;
  const bundledStack = 'Pretendard, Arial, sans-serif';
  result = result.replace(/font-family:\s*(['"]?)Geist\1\s*,\s*sans-serif/gi, `font-family: ${bundledStack}`);
  result = result.replace(/font-family:\s*(['"]?)Geist Mono\1\s*,\s*monospace/gi, `font-family: ${bundledStack}`);
  result = result.replace(/font-family:\s*(['"]?)Instrument Serif\1\s*,\s*serif/gi, `font-family: ${bundledStack}`);
  result = result.replace(/font-family=(["'])Geist,\s*sans-serif\1/gi, `font-family="${bundledStack}"`);
  result = result.replace(/font-family=(["'])Geist Mono,\s*monospace\1/gi, `font-family="${bundledStack}"`);
  result = result.replace(/font-family=(["'])Instrument Serif,\s*serif\1/gi, `font-family="${bundledStack}"`);

  if (!/Pretendard/i.test(result)) {
    result = result.replace(/(<svg\b[^>]*>)/i, `$1<style>text { font-family: ${bundledStack}; }</style>`);
  }
  return result;
}

function findBundledFonts(rootDir = path.resolve(__dirname, '..')) {
  const fontsDir = path.join(rootDir, 'assets', 'fonts');
  const candidates = [
    'Pretendard-Regular.ttf',
    'Pretendard-Bold.ttf',
    'Pretendard-Regular.otf',
    'Pretendard-Bold.otf'
  ].map(name => path.join(fontsDir, name));
  return candidates.filter(file => fs.existsSync(file));
}

function rasterizeSvgString(svg, outputPath, options = {}) {
  assertSupportedMarkup(svg);
  const storage = options.storage || ensureStorage();
  assertInsideStorage(outputPath, storage, 'outputPath');
  const width = options.width || 1152;
  const fontFiles = options.fontFiles || findBundledFonts(options.rootDir);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      loadSystemFonts: fontFiles.length === 0,
      fontFiles
    }
  });
  const pngData = resvg.render().asPng();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pngData);
  return outputPath;
}

function rasterizeHtmlFile(inputPath, outputPath, options = {}) {
  const html = fs.readFileSync(inputPath, 'utf8');
  const svg = extractSvgFromHtml(html);
  return rasterizeSvgString(svg, outputPath, {
    ...options,
    rootDir: options.rootDir || path.resolve(__dirname, '..')
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input || !args.output) {
    usage();
    process.exit(args.help ? 0 : 1);
  }
  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);
  rasterizeHtmlFile(inputPath, outputPath, { width: args.width });
  console.log(`PNG written: ${outputPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Rasterize failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  applyFontFallbacks,
  extractSvgFromHtml,
  findBundledFonts,
  rasterizeHtmlFile,
  rasterizeSvgString
};
