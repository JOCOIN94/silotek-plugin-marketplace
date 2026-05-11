# Upstream

Source fork:

```text
https://github.com/JOCOIN94/diagram-design
```

Local import source used during this integration:

```text
C:\Users\User\projects\diagram-design
```

Upstream license:

```text
MIT License
Copyright (c) 2025 Cathryn Lavery
```

The full license text is kept in `UPSTREAM-LICENSE`.

## Imported Files

- `skills/diagram-design/references/type-*.md`
- `skills/diagram-design/references/primitive-annotation.md`
- `skills/diagram-design/references/primitive-sketchy.md`
- `skills/diagram-design/assets/template.html`
- `skills/diagram-design/assets/template-full.html`

## Silotek Changes

- Reframed as an internal `silotek-tools` skill, not a separate Claude plugin.
- Removed website onboarding, website palette extraction, marketplace packaging, and external install instructions.
- Replaced the style guide with Silotek's editorial palette and Korean-safe font stack.
- Added an output contract for HTML sidecars plus PNG rasterization.
- Added safety constraints required by `scripts/rasterize-svg.js`.
