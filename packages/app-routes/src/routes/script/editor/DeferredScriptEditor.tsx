import {
    type EditorProps,
    ScriptEditor,
} from '@stagistic/editor';
import type {EditorSettingsOverride} from '@stagistic/script';
import {
    type ReactNode,
    useDeferredValue,
} from 'react';

interface DeferredScriptEditorProps extends Omit<EditorProps, 'settings'> {
    children?: ReactNode,
    scriptSettings: EditorSettingsOverride,
}

/**
 * This component mounts only after initial settings hydration. Subsequent
 * settings edits stay immediate in their controls while expensive editor
 * layout catches up through React's deferred value.
 */
export const DeferredScriptEditor = ({
    children,
    scriptSettings,
    ...editorProps
}: DeferredScriptEditorProps) => {
    const deferredScriptSettings = useDeferredValue(scriptSettings);

    return (
        <ScriptEditor
            {...editorProps}
            settings={{scriptSettings: deferredScriptSettings}}
        >
            {children}
        </ScriptEditor>
    );
};
