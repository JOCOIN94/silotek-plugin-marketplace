#!/usr/bin/env node
/**
 * 사일로텍 연구일지 자동 생성 엔진
 * 
 * 사용법:
 *   node build.js <input.yaml>
 *   node build.js inputs/2026-04-19-rag-test.yaml
 * 
 * 출력:
 *   outputs/<input-filename>.docx
 */

const { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, AlignmentType, LevelFormat, HeadingLevel, BorderStyle, 
  WidthType, ShadingType 
} = require('docx');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const AdmZip = require('adm-zip');
const { validateResearchLog, formatValidationErrors } = require('./scripts/common');

// ============================================================
// DOCX 후처리: fontTable.xml relationship 누락 수정
// docx-js는 fontTable.xml을 생성하지만 document.xml.rels에 참조를 추가 안하는 버그가 있음
// ============================================================
function fixFontTableRelationship(docxPath) {
  const zip = new AdmZip(docxPath);
  const relsEntry = zip.getEntry('word/_rels/document.xml.rels');
  const fontTableEntry = zip.getEntry('word/fontTable.xml');
  
  if (!relsEntry || !fontTableEntry) return;
  
  let relsXml = relsEntry.getData().toString('utf-8');
  
  // 이미 fontTable 참조 있는지 확인
  if (relsXml.includes('fontTable.xml')) return;
  
  // 가장 큰 rId 찾기
  const idMatches = relsXml.match(/Id="rId(\d+)"/g) || [];
  const maxId = Math.max(...idMatches.map(m => parseInt(m.match(/\d+/)[0])));
  const newId = maxId + 1;
  
  // fontTable 참조 추가
  const newRel = `  <Relationship Id="rId${newId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>\n`;
  relsXml = relsXml.replace('</Relationships>', newRel + '</Relationships>');
  
  zip.updateFile('word/_rels/document.xml.rels', Buffer.from(relsXml, 'utf-8'));
  zip.writeZip(docxPath);
}

// ============================================================
// 공통 스타일 및 헬퍼
// ============================================================

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

// PNG 크기 파싱 (IHDR 청크)
function getPngDimensions(buffer) {
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50) {
    return { width: 800, height: 600 };
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

// 텍스트 런 헬퍼
const tr = (text, opts = {}) => new TextRun({ text, ...opts });
const bold = (text) => tr(text, { bold: true });
const reg = (text) => tr(text);

// 기본 문단
function para(text, opts = {}) {
  return new Paragraph({
    children: Array.isArray(text) ? text : [tr(text)],
    spacing: { after: 120 },
    ...opts
  });
}

// 제목 레벨들
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [tr(text)],
    spacing: { before: 360, after: 180 }
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [tr(text)],
    spacing: { before: 280, after: 140 }
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [tr(text)],
    spacing: { before: 200, after: 100 }
  });
}

// 리스트
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: [tr(text)],
    spacing: { after: 80 }
  });
}

function numItem(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    children: [tr(text)],
    spacing: { after: 80 }
  });
}

// 코드 블록 (멀티라인 보존: 줄마다 TextRun + 첫 줄 뒤로는 <w:br/>)
function code(text) {
  const lines = String(text).replace(/\n$/, '').split('\n');
  const children = lines.map((line, idx) => tr(line, {
    font: "Consolas",
    size: 20,
    ...(idx === 0 ? {} : { break: 1 })
  }));
  return new Paragraph({
    children: children.length ? children : [tr("", { font: "Consolas", size: 20 })],
    spacing: { after: 120 },
    shading: { fill: "F5F5F5", type: ShadingType.CLEAR }
  });
}

// 테이블 셀
function tcell(text, opts = {}) {
  const width = opts.width || 3000;
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: opts.header ? { fill: "D5E8F0", type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      children: [tr(text, { bold: opts.header || false })],
      alignment: opts.align || AlignmentType.LEFT
    })]
  });
}

// 테이블 생성
function makeTable(data) {
  const headers = data.headers || [];
  const rows = data.rows || [];
  const columnWidths = data.columnWidths;
  
  // 전체 너비: A4 기본 본문 폭 (9026 DXA)
  const totalWidth = 9026;
  let widths;
  
  if (columnWidths) {
    widths = columnWidths;
  } else {
    // 균등 분할
    const colCount = headers.length || (rows[0] ? rows[0].length : 2);
    const even = Math.floor(totalWidth / colCount);
    widths = new Array(colCount).fill(even);
  }
  
  const tableRows = [];
  
  // 헤더
  if (headers.length) {
    tableRows.push(new TableRow({
      children: headers.map((h, i) => tcell(String(h), { 
        width: widths[i], 
        header: true,
        align: AlignmentType.CENTER
      }))
    }));
  }
  
  // 데이터
  rows.forEach(row => {
    tableRows.push(new TableRow({
      children: row.map((cell, i) => tcell(String(cell), { width: widths[i] }))
    }));
  });
  
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: tableRows
  });
}

// 이미지 삽입 (캡션 포함)
function makeImage(imgData, baseDir) {
  const imgPath = path.resolve(baseDir, imgData.path);
  
  if (!fs.existsSync(imgPath)) {
    console.warn(`⚠ 이미지를 찾을 수 없음: ${imgPath}`);
    return [para(`[이미지 없음: ${imgData.path}]`)];
  }
  
  const buffer = fs.readFileSync(imgPath);
  const widthInches = imgData.width || 6.0;
  const widthPx = Math.round(widthInches * 96);
  
  const dims = getPngDimensions(buffer);
  const aspectRatio = dims.height / dims.width;
  const heightPx = Math.round(widthPx * aspectRatio);
  
  const result = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 150, after: 80 },
      children: [new ImageRun({
        type: "png",
        data: buffer,
        transformation: { width: widthPx, height: heightPx }
      })]
    })
  ];
  
  if (imgData.caption) {
    result.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [tr(imgData.caption, { italics: true, size: 20, color: "666666" })]
    }));
  }
  
  return result;
}

function imageFileExists(element, baseDir) {
  if (!element || typeof element !== 'object' || !element.image || !element.image.path) {
    return false;
  }
  return fs.existsSync(path.resolve(baseDir, element.image.path));
}

// 텍스트 내 인라인 포맷 파싱 ("**bold** 일반 텍스트")
function parseInlineText(text) {
  if (!text) return [tr("")];
  
  const runs = [];
  // **text** 를 bold로, 나머지는 regular
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(bold(part.slice(2, -2)));
    } else if (part) {
      runs.push(reg(part));
    }
  }
  
  return runs.length ? runs : [reg(text)];
}

// ============================================================
// 섹션 렌더러 - YAML의 각 element를 docx 요소로 변환
// ============================================================

function renderElement(element, baseDir) {
  // 문자열은 기본 문단
  if (typeof element === 'string') {
    return [para(parseInlineText(element))];
  }
  
  // 객체 타입 분기
  const key = Object.keys(element)[0];
  const value = element[key];
  
  switch (key) {
    case 'h1': return [h1(value)];
    case 'h2': return [h2(value)];
    case 'h3': return [h3(value)];
    case 'p': return [para(parseInlineText(value))];
    case 'text': return [para(parseInlineText(value))];
    
    case 'bullets':
      return value.map(item => bullet(item));
    
    case 'numbers':
    case 'ordered':
      return value.map(item => numItem(item));
    
    case 'code':
      return [code(value)];
    
    case 'image':
      return makeImage(value, baseDir);
    
    case 'table':
      return [makeTable(value), para("")];
    
    case 'spacer':
    case 'blank':
      return [para("")];
    
    case 'note':
    case 'callout': {
      // 강조 박스 스타일 (음영 있는 문단)
      return [new Paragraph({
        children: parseInlineText(value),
        spacing: { before: 120, after: 120 },
        shading: { fill: "FFF9E6", type: ShadingType.CLEAR }
      })];
    }

    case 'visual_brief': {
      // 회색 박스: [그림 명세] purpose / claim / caption
      const lines = [
        `[${value.caption || '그림 명세'}]`,
        `목적: ${value.purpose || '(미명시)'}`,
        `핵심 주장: ${value.claim || '(미명시)'}`
      ];
      const paragraphs = lines.map(line => new Paragraph({
        children: parseInlineText(line),
        spacing: { before: 60, after: 60 },
        shading: { fill: "EEEEEE", type: ShadingType.CLEAR }
      }));
      return paragraphs;
    }

    default:
      throw new Error(`알 수 없는 요소 타입: ${key}`);
  }
}

// ============================================================
// 헤더 (로고 우측 상단)
// ============================================================

function makeHeader(logoPath) {
  if (!logoPath || !fs.existsSync(logoPath)) {
    console.warn(`⚠ 로고 파일 없음: ${logoPath}`);
    return new Header({ children: [para("")] });
  }
  
  const buffer = fs.readFileSync(logoPath);
  const dims = getPngDimensions(buffer);
  
  // 로고 높이 30px로 고정, 비율 유지
  const heightPx = 36;
  const widthPx = Math.round(heightPx * (dims.width / dims.height));
  
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0 },
        children: [new ImageRun({
          type: "png",
          data: buffer,
          transformation: { width: widthPx, height: heightPx }
        })]
      })
    ]
  });
}

// ============================================================
// 메인: YAML → DOCX
// ============================================================

function buildDocx(inputPath, outputPath) {
  const baseDir = path.dirname(path.resolve(inputPath));
  const yamlText = fs.readFileSync(inputPath, 'utf-8');
  const doc_data = yaml.load(yamlText);
  const schemaErrors = validateResearchLog(doc_data);
  if (schemaErrors.length) {
    throw new Error(formatValidationErrors(schemaErrors));
  }
  
  const children = [];
  
  // 표지 영역
  if (doc_data.title) {
    children.push(new Paragraph({
      children: [tr(doc_data.title, { bold: true, size: 36 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }));
  }
  
  if (doc_data.subtitle) {
    children.push(new Paragraph({
      children: [tr(doc_data.subtitle, { size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }));
  }
  
  // 메타 테이블
  if (doc_data.meta && Object.keys(doc_data.meta).length) {
    const metaRows = Object.entries(doc_data.meta).map(([k, v]) => 
      new TableRow({ children: [
        tcell(k, { width: 2340, header: true }),
        tcell(String(v), { width: 6686 })
      ]})
    );
    children.push(new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [2340, 6686],
      rows: metaRows
    }));
    children.push(para(""));
  }
  
  // 섹션들 (flat한 element 배열)
  if (doc_data.sections) {
    for (let i = 0; i < doc_data.sections.length; i += 1) {
      const element = doc_data.sections[i];
      const next = doc_data.sections[i + 1];
      const isVisualBrief = element && typeof element === 'object' && element.visual_brief;
      const nextIsImage = next && typeof next === 'object' && next.image;

      if (isVisualBrief && nextIsImage) {
        if (imageFileExists(next, baseDir)) {
          continue;
        }
        const rendered = renderElement(element, baseDir);
        children.push(...rendered);
        i += 1;
        continue;
      }

      const rendered = renderElement(element, baseDir);
      children.push(...rendered);
    }
  }
  
  // Footer
  children.push(new Paragraph({
    children: [tr("— 연구일지 끝 —", { italics: true, color: "888888" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 600 }
  }));
  
  // 로고 경로 - YAML에서 지정 또는 기본값
  const logoPath = doc_data.logo 
    ? path.resolve(baseDir, doc_data.logo)
    : path.resolve(baseDir, '..', 'figures', 'logo_silotek.png');
  
  // Document 생성
  const doc = new Document({
    styles: {
      default: { 
        document: { run: { font: "맑은 고딕", size: 22 } } 
      },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, font: "맑은 고딕", color: "1F4E79" },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: "맑은 고딕", color: "2E75B6" },
          paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: "맑은 고딕", color: "404040" },
          paragraph: { spacing: { before: 220, after: 110 }, outlineLevel: 2 } },
      ]
    },
    numbering: {
      config: [
        { reference: "bullets",
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
            { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }
          ] },
        { reference: "numbers",
          levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
          ] },
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: makeHeader(logoPath)
      },
      children: children
    }]
  });
  
  return Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(outputPath, buffer);
    // fontTable relationship 누락 수정
    try {
      fixFontTableRelationship(outputPath);
    } catch (e) {
      console.warn(`⚠ fontTable 수정 실패 (무시 가능): ${e.message}`);
    }
    const size = fs.statSync(outputPath).size;
    console.log(`✓ 생성 완료: ${outputPath}`);
    console.log(`  파일 크기: ${(size / 1024).toFixed(1)} KB`);
    return outputPath;
  });
}

// ============================================================
// CLI
// ============================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`사일로텍 연구일지 자동 생성 엔진

사용법:
  node build.js <input.yaml> [output.docx]

예시:
  node build.js inputs/2026-04-19-rag-test.yaml
  node build.js inputs/my-log.yaml outputs/my-log.docx

기본 출력 경로:
  outputs/<input-filename>.docx
`);
    process.exit(0);
  }
  
  const inputPath = args[0];
  
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 파일을 찾을 수 없음: ${inputPath}`);
    process.exit(1);
  }
  
  let outputPath = args[1];
  if (!outputPath) {
    const basename = path.basename(inputPath, path.extname(inputPath));
    outputPath = path.join('outputs', `${basename}.docx`);
    
    // outputs 폴더 없으면 생성
    if (!fs.existsSync('outputs')) {
      fs.mkdirSync('outputs', { recursive: true });
    }
  }
  
  buildDocx(inputPath, outputPath).catch(err => {
    console.error(`❌ 실패: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { buildDocx };
