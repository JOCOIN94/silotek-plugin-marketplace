# Silotek Diagram Style Guide

Use this style guide for every diagram created by `silotek-diagram-design`.

## Palette

```css
:root {
  --navy: #1e3a5f;
  --teal: #2c8d8a;
  --gray: #6b7280;
  --paper: #f8fafc;
  --ink: #0f172a;
  --line: #cbd5e1;
  --muted: #e5e7eb;
  --white: #ffffff;
}
```

Use `--navy` for the focal structure, `--teal` for one active path or highlight, and `--gray` for secondary evidence. Avoid extra accents unless the user asks.

## Typography

Use this font stack in SVG text:

```css
font-family: Pretendard, Arial, sans-serif;
```

Use one title size, one label size, and one note size. Keep labels short enough to fit their containers.

## Geometry

- 4px grid.
- 8px corner radius maximum.
- 1.5px to 2px strokes.
- No shadows.
- No gradient-only meaning.
- Keep major boxes to 9 or fewer by default.

## HTML/SVG Contract

- Self-contained HTML.
- Exactly one inline SVG.
- No JavaScript.
- No remote assets.
- No `foreignObject`.
- The SVG must rasterize cleanly at 1152px width.
