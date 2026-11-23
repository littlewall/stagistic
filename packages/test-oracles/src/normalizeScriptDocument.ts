import type {ScriptDocument, ScriptNode} from '@stagistic/script';

/*
 * Comparison form of a ScriptDocument. Ignores what is derived or assigned outside the
 * script text, so equivalent documents compare equal:
 * - block `id`, and `characterRefs` (links from cue names to roster characters);
 * - `musicId` on music starts (a fresh id per read);
 * - `characterKey` (derived from the tag text) and `characterId` (roster link) on
 *   characterTag marks;
 * - document-level attrs (settings, import metadata).
 * `{keepLinks: true}` keeps `characterRefs`, `musicId` and the characterTag `characterId`/`characterKey` (for
 * oracles whose store must preserve them verbatim; block `id` is always dropped).
 * It also merges adjacent text nodes carrying the same marks and drops empty text nodes.
 */
const IGNORED_NODE_ATTRS = new Set([
    'id',
    'characterRefs',
    'musicId',
]);
const IGNORED_MARK_ATTRS = new Set(['characterKey', 'characterId']);
const IGNORED_NODE_ATTRS_KEEPING_LINKS = new Set(['id']);
const IGNORED_MARK_ATTRS_KEEPING_LINKS = new Set<string>();

export interface NormalizeOptions {
    keepLinks?: boolean,
}

export interface NormalizedScriptNode {
    type: string,
    text?: string,
    attrs?: Record<string, unknown>,
    marks?: Array<{type: string, attrs?: Record<string, unknown>}>,
    content?: NormalizedScriptNode[],
}

export interface NormalizedScriptDocument {
    content: NormalizedScriptNode[],
}

const omitKeys = (attrs: Record<string, unknown> | undefined, ignored: ReadonlySet<string>) => {
    return attrs ? Object.fromEntries(Object.entries(attrs).filter(([key]) => !ignored.has(key))) : undefined;
};

const nonEmpty = <T extends object>(value: T | undefined): T | undefined => {
    return value && Object.keys(value).length > 0 ? value : undefined;
};

const normalizeMarks = (marks: ScriptNode['marks'], ignored: ReadonlySet<string>) => {
    const normalized = (marks ?? []).map(mark => {
        const attrs = nonEmpty(omitKeys(mark.attrs, ignored));

        return {type: mark.type, ...attrs ? {attrs} : {}};
    });

    return normalized.length > 0 ? normalized : undefined;
};

const normalizeNodes = (nodes: ScriptNode[] | undefined, options: NormalizeOptions): NormalizedScriptNode[] => {
    const ignoredNode = options.keepLinks ? IGNORED_NODE_ATTRS_KEEPING_LINKS : IGNORED_NODE_ATTRS;
    const ignoredMark = options.keepLinks ? IGNORED_MARK_ATTRS_KEEPING_LINKS : IGNORED_MARK_ATTRS;
    const result: NormalizedScriptNode[] = [];

    for (const node of nodes ?? []) {
        if (node.type === 'text' || typeof node.text === 'string') {
            const text = node.text ?? '';
            const marks = normalizeMarks(node.marks, ignoredMark);

            if (!text) {
                continue;
            }

            const previous = result[result.length - 1];

            if (previous?.type === 'text' && JSON.stringify(previous.marks) === JSON.stringify(marks)) {
                previous.text = `${previous.text ?? ''}${text}`;
                continue;
            }

            result.push({
                type: 'text',
                text,
                ...marks ? {marks} : {},
            });
            continue;
        }

        const attrs = nonEmpty(omitKeys(node.attrs, ignoredNode));
        const content = normalizeNodes(node.content, options);
        const marks = normalizeMarks(node.marks, ignoredMark);

        result.push({
            type: node.type ?? '',
            ...attrs ? {attrs} : {},
            ...marks ? {marks} : {},
            ...content.length > 0 ? {content} : {},
        });
    }

    return result;
};

export const normalizeScriptDocument = (document: ScriptDocument, options: NormalizeOptions = {}): NormalizedScriptDocument => ({
    content: normalizeNodes(document.content, options),
});
