# Silotek Tools

`silotek-tools`는 Silotek 연구 로그와 편집용 다이어그램을 위한 Claude Code 플러그인 패키지입니다.

## 명령어

```text
/silotek-tools:setup-check
/silotek-tools:research-log-yaml-create
/silotek-tools:research-log-yaml-retouch
/silotek-tools:research-log-docx-create
/silotek-tools:diagram-create
```

## 각 명령어의 역할

- `setup-check`: 의존성, 저장 경로, 템플릿 파싱, 에셋, 매니페스트, 래스터라이저 가용성에 대한 읽기 전용 진단.
- `research-log-yaml-create`: 연구 로그 YAML 초안을 작성하여 중앙 저장소에 저장.
- `research-log-yaml-retouch`: 기존 YAML을 해석해 AI가 재작성하게 하고, 원본을 덮어쓰지 않으면서 수정본 사본을 저장.
- `research-log-docx-create`: 저장된 YAML로부터 DOCX 빌드.
- `diagram-create`: 독립 HTML 다이어그램과 PNG를 `.silotek-diagrams/` 아래에 생성.

## 다이어그램 스킬

독립 다이어그램 기능은 다음 위치에 있습니다:

```text
skills/silotek-diagram-design/
```

이 스킬은 타입 참조 규칙과 HTML + 인라인 SVG 출력 컨벤션을 갖춘 내부 Silotek 라이트 다이어그램 스킬입니다. 원격 에셋, 테마 변형, 갤러리 예제는 사용하지 않습니다.

연구 로그에서는 `silotek-diagrammer` 서브에이전트(`agents/silotek-diagrammer.md`)가 이 스킬을 감싸므로, 메인 세션이 여러 개의 다이어그램을 병렬로 — `visual_brief`마다 디스패치 한 번씩 — 생성할 수 있습니다.

이 스킬은 편집 가능한 HTML 사이드카와 래스터라이즈된 PNG 파일을 출력합니다. DOCX 생성은 PNG만 임베드하며, HTML은 절대 Word에 임베드되지 않습니다.

출력 품질은 다이어그램 테이스트 게이트, `npm test`, 빌드/래스터화 점검, 실사용 피드백으로 관리합니다. 기대 출력 자체가 계속 개선되어야 하므로, 이 도구는 고정된 예제 출력물을 품질 목표로 유지하지 않습니다.

## 연구 로그 흐름

1. `/silotek-tools:research-log-yaml-create`는 소스 모드(`conversation`/`folder`/`mixed`)와 연구 성격(`구축`/`분석`/`검증`)을 결정하며, 모호한 경우 사용자에게 확인을 받습니다.
2. `scripts/next-basename.js`로 중앙 보관소 안에 `inputs/<basename>.yaml`과 `figures/<basename>/` 경로를 미리 확보합니다. 작업 폴더(레포)에는 어떤 파일도 만들지 않습니다.
3. 그림이 도움이 되는 자리마다 `visual_brief` 자리표시자를 포함한 YAML을 2단계에서 받은 `yamlPath`(중앙 `inputs/`)에 곧장 작성합니다.
4. 브리프 목록을 보여주고 사용자에게 확인을 받은 뒤 `scripts/next-diagram-path.js <figuresDir> --count`로 경로를 할당하고, 각 브리프마다 `silotek-diagrammer` 서브에이전트를 병렬로 디스패치합니다. 각 서브에이전트는 `silotek-diagram-design`을 실행해 중앙 `figures/<basename>/diagram-N.html`을 쓰고 `diagram-N.png`로 래스터화합니다.
5. 반환된 각 PNG를 즉시 뒤따르는 `image` 요소(경로 `../figures/<basename>/diagram-N.png`)로 짝짓습니다. 건너뛰거나 실패한 브리프는 짝이 맞지 않은 채로 남습니다.
6. `scripts/save-draft.js`가 중앙 YAML을 검증하고 manifest를 기록합니다. 복사 단계는 없습니다 — 모든 파일이 이미 중앙에 있습니다. 참조된 PNG가 없을 때는 `--no-rasterize`가 지정되지 않은 한 형제 HTML을 자동 래스터화합니다.
7. `/silotek-tools:research-log-docx-create`가 저장된 YAML로부터 DOCX를 빌드합니다.

짝지어진 이미지가 있으면 DOCX는 이미지를 렌더링하고 회색 `visual_brief` 폴백 박스를 억제합니다. 이미지가 없으면 폴백 박스가 그대로 보입니다.

## 중앙 저장소

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs
macOS:   $HOME/Documents/Silotek Research Logs
```

저장소 레이아웃:

```text
Silotek Research Logs/
  inputs/      YAML 원본 및 수정본 사본
  outputs/     DOCX 출력물
  manifests/   JSON 이력
  figures/     연구 로그별 복사된 이미지 에셋
```

## 로컬 명령

Windows PowerShell:

```powershell
npm.cmd install --prefix .\plugins\silotek-tools
node .\plugins\silotek-tools\scripts\setup-check.js
node .\plugins\silotek-tools\scripts\list-yaml.js
node .\plugins\silotek-tools\scripts\next-basename.js --title "<연구 주제>" --date <YYYY-MM-DD> --json
node .\plugins\silotek-tools\scripts\save-draft.js "<중앙 inputs/...yaml>" --mode folder
node .\plugins\silotek-tools\scripts\resolve-yaml.js 1 --json
node .\plugins\silotek-tools\scripts\build-docx.js 1
node .\plugins\silotek-tools\scripts\next-diagram-path.js .silotek-diagrams --json
npm.cmd test --prefix .\plugins\silotek-tools
```

macOS/Linux 셸:

```bash
npm install --prefix ./plugins/silotek-tools
node ./plugins/silotek-tools/scripts/setup-check.js
node ./plugins/silotek-tools/scripts/list-yaml.js
node ./plugins/silotek-tools/scripts/next-basename.js --title "<연구 주제>" --date <YYYY-MM-DD> --json
node ./plugins/silotek-tools/scripts/save-draft.js "<중앙 inputs/...yaml>" --mode folder
node ./plugins/silotek-tools/scripts/resolve-yaml.js 1 --json
node ./plugins/silotek-tools/scripts/build-docx.js 1
node ./plugins/silotek-tools/scripts/next-diagram-path.js .silotek-diagrams --json
npm test --prefix ./plugins/silotek-tools
```

## 마이그레이션

v0.3.0은 브레이킹 이름 변경입니다. 옛 명령 별칭은 의도적으로 유지하지 않습니다.

```text
/plugin uninstall silotek-research-log@silotek-tools
/plugin marketplace update silotek-tools
/plugin install silotek-tools@silotek-tools --scope user
```

로컬 소스를 변경한 뒤에는 Claude Code가 현재 버전을 로드하도록 플러그인을 재설치하거나 캐시를 업데이트하세요. 현재 버전은 `package.json` / `.claude-plugin/plugin.json`을 참조하세요.
