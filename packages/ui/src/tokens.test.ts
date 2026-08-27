import {readdirSync, readFileSync} from 'node:fs';
import {
    dirname, join, relative, resolve,
} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
    describe, expect, it,
} from 'vite-plus/test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const CSS_ROOTS = [
    'packages/ui',
    'packages/app-routes',
    'packages/editor',
    'apps/web',
];

/*
 * Declared from a TypeScript inline style rather than in CSS, so no stylesheet
 * declares them and the undeclared-read check would flag them. Each entry has a verified
 * setter in a non-test .ts/.tsx file; see docs/design/token-triage-2026-08-25.md.
 */
const RUNTIME_INJECTED: ReadonlySet<string> = new Set([
    '--character-color',
    '--editor-sidebar-width',
    '--left-sidebar-size',
    '--music-pill-anchor',
    '--right-sidebar-size',
]);

const collectCssFiles = (dir: string): string[] => {
    return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
        if (entry.name === 'node_modules' || entry.name === 'dist') {
            return [];
        }

        const full = join(dir, entry.name);

        if (entry.isDirectory()) {
            return collectCssFiles(full);
        }

        return entry.name.endsWith('.css') ? [full] : [];
    });
};

const DECLARATION = /(?:^|[;{\s])(--[a-z0-9-]+)\s*:/gi;
const USAGE = /var\(\s*(--[a-z0-9-]+)\s*([,)])/gi;

const sources = CSS_ROOTS
    .flatMap(root => collectCssFiles(join(repoRoot, root)))
    .map(path => ({
        path: relative(repoRoot, path),
        text: readFileSync(path, 'utf8'),
    }));

describe('css custom properties', () => {
    it('collects css from every in-scope package', () => {
        expect(sources.length).toBeGreaterThan(100);
    });

    it('never reads an undeclared custom property without a fallback', () => {
        const declared = new Set<string>(RUNTIME_INJECTED);

        for (const {text} of sources) {
            for (const match of text.matchAll(DECLARATION)) {
                declared.add(match[1]);
            }
        }

        const missing = new Set<string>();

        for (const {text} of sources) {
            for (const match of text.matchAll(USAGE)) {
                const [
                    , name,
                    terminator,
                ] = match;

                if (terminator === ',') {
                    continue;
                }

                if (!declared.has(name)) {
                    missing.add(name);
                }
            }
        }

        expect([...missing].sort()).toEqual([]);
    });

    it('declares no --select-* or --segment-* variable in :root', () => {
        const tokens = readFileSync(
            join(repoRoot, 'packages/ui/styles/tokens.css'),
            'utf8',
        );

        /*
         * --bubble-menu-* is deliberately allowed: both of its readers are
         * bubble menus, so the name describes the pattern rather than one
         * component. See docs/design/token-triage-2026-08-25.md.
         */
        const offenders = [...tokens.matchAll(DECLARATION)]
            .map(match => match[1])
            .filter(name => (/^--(select|segment)-/).test(name));

        expect(offenders).toEqual([]);
    });
});

describe('dev catalog coverage', () => {
    it('catalogues every component @stagistic/ui exports', () => {
        const index = readFileSync(
            join(repoRoot, 'packages/ui/src/index.ts'),
            'utf8',
        );
        const registry = ['primitives', 'controls']
            .map(name => readFileSync(
                join(repoRoot, `apps/web/src/dev/registry/${name}.tsx`),
                'utf8',
            ))
            .join('\n');

        /*
         * A component is a PascalCase value export. That excludes `type`
         * exports, the hooks, `formControlStyles`, the SCREAMING_CASE
         * constants and the theme helper functions — none of which have a
         * visual form to catalogue.
         */
        const components = [...index.matchAll(/export \{([^}]*)\}/g)]
            .flatMap(match => match[1].split(','))
            .map(name => name.trim())
            .filter(name => (/^[A-Z][A-Za-z0-9]*$/).test(name) && !(/^[A-Z0-9_]+$/).test(name));

        /*
         * Everything packages/ui exports that the catalog does not cover yet.
         * The Patterns and Editor plans (spec steps 5-8) empty this list; it
         * only ever shrinks. It is spelled out rather than inferred so that a
         * NEWLY exported component fails this test until someone either
         * catalogues it or consciously adds it here.
         */
        const NOT_CATALOGUED_YET = new Set([
            'InlineTooltip',
            'AttributeManagerCharactersPanel',
            'AttributeManagerDetailTabs',
            'AttributeManagerGroupDetail',
            'AttributeManagerListPanel',
            'AttributeManagerModal',
            'AttributeManagerMusicDetail',
            'AttributeManagerPlacesPanel',
            'AttributeManagerSceneDetail',
            'CreateCharacterModal',
            'CreateGroupModal',
            'CreatePlaceModal',
            'DeleteScriptConfirm',
            'DeleteScriptModal',
            'DuplicateScriptModal',
            'ImportScriptModal',
            'ModalDialog',
            'NewScriptModal',
            'PublicPreviewNotice',
            'RemoveAttachmentModal',
            'RemoveGroupModal',
            'RenameScriptModal',
            'ScriptSettingsModal',
            'EditorSidebar',
            'ExportPanel',
            'ProgressBar',
            'ProgressPanel',
            'ToastProvider',
            'AppFooter',
            'AppHeader',
            'ScriptEditorAppHeader',
            'AppLayout',
            'LoaderOverlay',
            'ButtonGroup',
            'Card',
            'CardContent',
            'CardFooter',
            'CardHeader',
            'FormSelect',
            'InputTable',
            'MultiComboBox',
            'SettingSwitch',
            'TextInput',
            'ScriptActionsMenu',
            'ToggleButtonGroup',
            'Grid',
            'HeroLayout',
            'PageContainer',
            'PageHeader',
            'Section',
            'SectionHeader',
        ]);

        const missing = components
            .filter(name => !NOT_CATALOGUED_YET.has(name))
            .filter(name => !registry.includes(`name: '${name}'`));

        expect(missing).toEqual([]);
    });
});
