export function createEditorId(prefix = 'editor') {
    return `${prefix}-${crypto.randomUUID()}`;
}
