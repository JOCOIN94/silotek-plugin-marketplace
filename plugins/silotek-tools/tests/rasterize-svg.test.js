const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { applyFontFallbacks } = require('../scripts/rasterize-svg.js');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'rasterize-svg.js');
const FIXTURES = path.join(__dirname, 'fixtures');

function runRasterize(input, output) {
  return spawnSync('node', [SCRIPT, input, output], { encoding: 'utf8' });
}

test('rasterize-svg creates a PNG from a Korean inline SVG HTML file', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-raster-'));
  const output = path.join(tmp, 'diagram.png');
  const result = runRasterize(path.join(FIXTURES, 'diagram-korean.html'), output);

  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  const bytes = fs.readFileSync(output);
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(bytes.length > 1000);
});

test('rasterize-svg rejects HTML without exactly one inline SVG', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-raster-'));
  const input = path.join(tmp, 'no-svg.html');
  const output = path.join(tmp, 'diagram.png');
  fs.writeFileSync(input, '<html><body><p>no svg</p></body></html>', 'utf8');

  const result = runRasterize(input, output);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exactly one inline SVG/i);
});

test('rasterize-svg rejects script and remote asset content', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-raster-'));
  const input = path.join(tmp, 'unsafe.html');
  const output = path.join(tmp, 'diagram.png');
  fs.writeFileSync(input, `
    <html><body>
      <script>alert('x')</script>
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <image href="https://example.com/x.png"/>
      </svg>
    </body></html>
  `, 'utf8');

  const result = runRasterize(input, output);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported/i);
});

test('font fallback maps legacy sans, mono, and serif names to bundled Pretendard stack', () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg">
      <text style="font-family: Geist, sans-serif">A</text>
      <text style="font-family: Geist Mono, monospace">B</text>
      <text style="font-family: Instrument Serif, serif">C</text>
      <text font-family="Geist Mono, monospace">D</text>
    </svg>
  `;

  const result = applyFontFallbacks(svg);
  assert.match(result, /Pretendard, Arial, sans-serif/);
  assert.doesNotMatch(result, /Pretendard Mono/);
});
