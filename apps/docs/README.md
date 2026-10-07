# Stagistic documentation

Static Astro/Starlight application for `https://docs.stagistic.com`, using [Lucode Starlight](https://lucas-labs.github.io/lucode-starlight-theme/) for its layout and component styles. The shell and section overviews are in place. Characters has six task guides, Writing your script has seven, Acts and scenes has six and Scripts and files has seven ready for editorial review; other categories and the syntax migration remain preparatory.

## Local development

Run commands from the repository root after `pnpm install`:

```sh
moon run docs:dev
moon run docs:typecheck
moon run docs:lint
moon run docs:build
moon run docs:preview
```

Development and production preview request `http://localhost:4322`. If the port is occupied, Astro chooses the next available port; use the URL printed by the command. Search is built by Pagefind during `docs:build`; use the production preview to verify search. The dev server does not provide the production search index.

## Content and navigation

- `src/content/docs/index.md`: shared knowledge base homepage with section cards.
- `src/content/docs/editor/`: Editor splash page and task-oriented user guide.
- `src/content/docs/syntax/`: Syntax splash page and technical reference.
- `src/navigation/sections.ts`: section routes, labels, directory descriptions and sidebars.
- `src/routeData.ts`: Starlight route middleware that scopes navigation to the current section.
- `src/content/i18n/en.json`: documentation UI text overrides.
- `astro.config.mjs`: explicit sidebar and canonical site URL.
- `src/styles/docs.css`: white reading surfaces, warm paper sidebars and the landing palette mapped to Lucode and Starlight CSS variables.
- `src/components/KnowledgeBaseHeader.astro`: dark header with the landing mark, "Knowledge base", Lucode search, its mobile drawer trigger and the visible `stagistic.com` link.
- `src/components/KnowledgeBaseContent.astro`: Lucode Markdown rendering with a centered content container on splash pages.
- `src/components/KnowledgeBasePageTitle.astro`: article headings with inline code in descriptions; descriptions without literal input use Lucode's original title component.
- `src/components/KnowledgeBaseSectionNav.astro`: persistent Editor/Syntax links with the current section identified.
- `src/components/KnowledgeBaseDirectory.astro`: homepage cards generated from the section registry.
- `src/components/LightThemeProvider.astro`: consistent light reading mode regardless of stored or system dark-mode preferences.
- `src/assets/stagistic-mark-on-dark.svg`: the existing landing mark, reused unchanged.

The shared homepage uses Starlight's `splash` template and Lucode's `centered` hero with equal entrances to Editor and Syntax. Each section has its own splash page using Lucode's `banner` layout. Lucode provides compact typography, sidebar rows, rounded controls, search and article layout. Navigation uses Lucode's system font and native active-page treatment; the surrounding interface uses IBM Plex Sans. The original logo and landing palette remain Stagistic's. Sidebar border and fade decorations are hidden to keep the warm navigation surface uniform. The header remains dark on all pages; content and the search dialog remain white. There is no theme picker in this design. On small screens the header uses three rows so the website destination stays readable alongside search and the mobile menu.

Article headings and descriptions use the full reading-column width, with a subtle bottom separator. Descriptions wrap naturally; Lucode's 80% maximum width and balanced line wrapping are overridden. The same treatment applies to descriptions containing inline code. Article headers do not reserve space for an illustration.

The plugin is configured in `astro.config.mjs`; `content.config.ts` extends the docs schema with `ExtendDocsSchema` for Lucode's hero layouts and action variants. The app overrides the branded header, fixed light theme provider, splash content container and descriptions containing literal input. Those wrappers import Lucode's public components; dependency files are not modified. Override theme tokens in the app stylesheet when adjusting the design.

Content uses Markdown with validated Starlight frontmatter. Starlight also supports MDX when a future article needs an interactive example. Add a finished article beside its category's `index.md`, then add its content slug to the sidebar. Nested index entries use the directory slug, for example `editor/characters`, while the root page uses `index`.

The public shell provisionally uses English, matching the current website and editor. The [category proposal](../../docs/proposals/editor-documentation-structure.md) is in Czech for review. Future translations can use Starlight locales and content directories; none are claimed as available yet.

## Keyboard keys and literal input

Use semantic `<kbd>` markup whenever a guide names a keyboard key. Keep the key name visible alongside its symbol; hide the decorative symbol from assistive technology so the name is read once. Lucode supplies the keycap border; `docs.css` keeps the background white and adds spacing and a subtle bottom shadow.

```html
<kbd><span aria-hidden="true">⏎</span> Enter</kbd>
<kbd><span aria-hidden="true">⇥</span> Tab</kbd>
<kbd><span aria-hidden="true">⇧</span> Shift</kbd>
<kbd>Esc</kbd>
<kbd><span aria-hidden="true">↑</span> Arrow up</kbd>
<kbd><span aria-hidden="true">↓</span> Arrow down</kbd>
```

For combinations, put each key in its own keycap separated by ` + `, for example Shift + Enter. Describe platform-specific modifiers explicitly when the shortcut differs by platform.

Literal characters and text that users type use Markdown backticks, including in headings: ``## Should I use `+` or `/`?``. This includes full examples such as `Robin opens the door.` and inline input in article frontmatter descriptions. `KnowledgeBasePageTitle` renders backtick-delimited parts as escaped `<code>` elements, while route middleware removes the delimiters from search-engine and social metadata. The article title layout matches Lucode; this site disables pagination and does not enable its AI menu. A verb such as “Enter a speaker” is ordinary prose, not a keyboard key.

## Editor button icons

When an instruction refers to a button that only shows an icon in the editor, place that same icon beside its visible tooltip or accessible label. Keep the text so readers can recognize the control and assistive technology can read the instruction. Do not add an icon to a separate text button, such as the final **Create group** or **Remove** confirmation.

```html
<img class="kb-editor-icon" src="/icons/editor/attribute-manager.svg" alt="" aria-hidden="true" /> **Open characters in attribute manager**
<img class="kb-editor-icon" src="/icons/editor/add.svg" alt="" aria-hidden="true" /> **Add character**
```

The SVGs in `public/icons/editor/` use the actual editor icon paths, with a consistent light `1.5` stroke for reading alongside prose and without adding the editor's React dependencies to this static app. Keep them synchronized with these sources when the editor icons change:

| Asset | Source |
| --- | --- |
| `attribute-manager.svg` | `packages/ui/src/icons/ui/AttributeManagerIcon.tsx` |
| `add.svg` | `Plus` from `iconoir-react`, used by the UI's `PlusIcon` |
| `manage.svg` | `EditPencil` from `iconoir-react`, used by the UI's `EditPencilIcon` |
| `confirm.svg` | Inline checkmark in `packages/ui/src/editor-panels/CharacterRowPending.tsx` |
| `remove.svg` | `Trash` from `iconoir-react`, used by the UI's `TrashIcon` |
| `bold.svg`, `italic.svg`, `underline.svg` | `Bold`, `Italic`, `Underline` from `iconoir-react`, used by the UI's formatting icons |
| `scene.svg`, `stage-direction.svg`, `character.svg` | The editor's `BLOCK_ICONS`, also used in the empty-block type chooser |
| `settings.svg` | `Settings` from `iconoir-react`, used by the UI's `SettingsIcon` |
| `collapse-scene.svg` | `NavArrowDown` from `iconoir-react`, used by the UI's `ChevronDownIcon` |
| `block-actions.svg` | `MoreHorizontalIcon` in `packages/editor/src/editor/components/blockActions/BlockActionMenu.tsx` |
| `drag-scene.svg` | Static dot-grid representation of `.dragHandle` in `packages/app-routes/src/routes/script/editor/structure/ScriptStructureSidebar.module.css` |
| `home.svg`, `download.svg`, `script-actions.svg` | `Home`, `Download`, `MoreHoriz` from `iconoir-react`, used by `HomeIcon`, `DownloadIcon`, `MoreIcon` |

Use this pattern in future categories too. Check the actual control's icon and label first; an icon that changes with the current block type needs contextual explanation rather than a single fixed image. Structure uses **Add to structure → Add act**; scenes are created with the Scene block type. The dot-grid drag asset represents a CSS-drawn handle, rather than an SVG supplied by the application.

## Independent sections

| Entry | Role |
| --- | --- |
| `/` | Shared directory for all documented Stagistic tools and formats. |
| `/editor/` | Editor overview; user-guide topics live at `/editor/...`. |
| `/editor/getting-started/` | Introduction to using the editor. |
| `/syntax/` | Introduction to the text format's technical documentation. |
| `/syntax/reference/` | Preparatory format reference, awaiting the full specification. |

The header and mobile drawer always offer links to both sections. A section's sidebar contains only its own topics, including on directly opened nested routes. The root page has no sidebar. Search is shared across the knowledge base, and result URLs identify the section. The new routes replace the initial local `/guide/` and `/technical/` scaffold; no published URLs or landing routes were changed.

To add another product, add an entry to `documentationSections` with a trailing-slash route prefix, directory description and sidebar items, then add its content under that prefix. Header links, homepage cards, mobile section links and sidebar scoping use this registry. Create a splash overview with the desired Lucode hero layout. Detailed topics remain normal docs pages.

Keep each section's sidebar as groups containing immediate page links, as in the existing sections. Lucode's mobile drawer omits standalone root links and nested groups; supporting those shapes requires adapting the drawer first. Independent review confirmed the current structure has no blocking findings and identified this authoring constraint.

## Static hosting

Configure a static host using the repository root as the install/build directory:

| Setting | Value |
| --- | --- |
| Node | Follow the root `engines` requirement, currently `>=24.12.0`. |
| Package manager | Follow root `packageManager`, currently `pnpm@11.17.0`. |
| Install | `pnpm install --frozen-lockfile` |
| Build | `pnpm exec moon run docs:build` |
| Publish directory | `apps/docs/dist` |
| Intended domain | `docs.stagistic.com` |

The deployed files require no API, database, secrets or server runtime. Serve directory indexes (`/editor/characters/` → `editor/characters/index.html`) and serve `404.html` with HTTP 404 for unknown routes. Do not use a single-page-app catch-all redirect. Publish the `_astro` and `pagefind` directories along with all generated pages; search needs the Pagefind JavaScript, WASM and index files.

The canonical URL is already configured; domain registration, DNS and deployment are separate hosting actions. No remote infrastructure has been provisioned or changed.

The foundation currently sets a global `noindex, nofollow` robots meta tag while the content pilot is under review and most categories remain preparatory. Remove it when approved content is ready for public indexing. The sitemap is generated by Starlight.

## Phase boundaries

The existing landing `/editor/syntax` page remains unchanged. In the content phase it will become a concise introduction with the format's motivation and verified comparisons with Fountain. The full technical reference will then move to `/syntax/reference/`; do not redirect the landing introduction away.

Links from the landing header and editor should be added when useful content is ready. For now, the application can be reviewed locally without sending existing users to an unfinished guide.

## Review references

- [Approved direction](../../docs/proposals/editor-user-documentation.md)
- [Category and article proposal](../../docs/proposals/editor-documentation-structure.md)
- [Writing your script content proposal](../../docs/proposals/editor-documentation-writing.md)
- [Implementation and verification record](../../docs/superpowers/plans/2026-10-05-documentation-foundation.md)
- [Writing your script verification record](../../docs/superpowers/plans/2026-10-06-writing-documentation.md)

## Verification and handoff

The initial foundation passed `docs:typecheck`, `docs:lint`, `docs:build` and the root format check scoped to its JavaScript/TypeScript sources. A frozen-lockfile install and landing typecheck/build also passed after adding the shared Astro Markdown peer dependency.

The production output was checked for 258 internal links and 66 heading anchors across 11 pages, with no missing targets. Browser checks covered search results, opening a result, Cmd+K/Escape, mobile navigation at 390px, light/dark themes, absence of horizontal page overflow and the branded HTTP 404 response. Independent review reported no findings.

After the landing-inspired redesign, `docs:typecheck`, `docs:lint`, `docs:build` and the scoped root format check passed again. Browser checks at 1440px and 390px confirmed the white reading surface, dark branded header, visible website domain, splash overview, mobile menu, working search and navigation to a result without horizontal overflow. The knowledge graph was refreshed.

The Lucode integration also passed those checks. Browser verification covered the centered splash, desktop article sidebar and table of contents, white search dialog with results and result navigation, mobile drawer navigation, and separate search/domain controls at 320px and 390px. Lucode's blue note treatment was mapped to the existing neutral palette.

The independent Editor/Syntax structure passed `docs:lint`, `docs:typecheck`, `docs:build` and the scoped root format check. The generated 13 pages contain 303 valid internal links and 45 valid heading anchors. All page headers identify the correct section; Editor sidebars contain only Editor routes, Syntax sidebars only Syntax routes, and the homepage has none. Browser checks confirmed both directory cards, banner section pages, global section switching, a search result opening from Syntax into Editor, mobile drawer scoping, and header layouts at 320px, 390px, 800px and 1440px without horizontal overflow.

Starlight's custom 404 entry currently produces an Astro route-conflict warning during build; the higher-priority 404 route renders the custom page, and unknown routes return HTTP 404 in production preview. Existing workspace peer warnings concern Vitest/Vite, Tiptap and stylelint, not docs dependencies.

The review preview for this session is `http://localhost:4324/`. No deployment or commit has been made. Suggested commit message: `feat(docs): add documentation app and guide structure`.

The keyboard and button-icon presentation passed `docs:lint` and `docs:build`. Browser checks of the Characters guides confirmed white keycaps with their border and shadow intact, loaded inline SVGs with no inherited image margins, retained text labels and decorative image semantics, and no horizontal overflow at desktop and 390px mobile widths.

The follow-up with lighter icon strokes and literal input in article descriptions passed `docs:lint`, `docs:typecheck` and `docs:build`. Browser checks confirmed matching inline-code backgrounds and spacing in descriptions and paragraphs, the full sentence example rendered as code, plain-text metadata without backticks, and no horizontal overflow at 390px.

Review the category proposal before writing the detailed articles. Review and commit the application and documentation changes when ready; existing unrelated files under `docs/` are outside this change.
