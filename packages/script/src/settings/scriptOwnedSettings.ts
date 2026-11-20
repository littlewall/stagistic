import type {EditorSettingsOverride} from './types';

/** Values outside block styles remain owned by the script, including while locked. */
export const scriptOwnedSettings = (override: EditorSettingsOverride | null): EditorSettingsOverride => ({
    ...override,
    blocks: Object.fromEntries(Object.entries(override?.blocks ?? {}).map(([type, block]) => [
        type,
        {
            shortcut: block?.shortcut,
            nextElement: block?.nextElement,
        },
    ])),
});

