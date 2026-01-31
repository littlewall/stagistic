import {fountainParser} from '@stagistic/editor-core';
import {
    createNodeId,
    type SlateValue,
} from '@stagistic/shared';
import {type Value} from 'platejs';
import {Plate, usePlateEditor} from 'platejs/react';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import {
    Element,
    Node,
} from 'slate';

import {EditorCanvas} from '~components/EditorCanvas';
import EditorToolbar from '~components/EditorToolbar';
import {createFountainPlugins} from '~plugins/fountainPlugin';
import {FountainLeaf} from '~utils/fountainMarks';

import styles from './Editor.module.css';

type EditorProps = {
    initialValue?: SlateValue,
    onValueChange?: (value: SlateValue) => void,
    onManualSave?: (value: SlateValue) => void,
    autoFocus?: boolean,
    activeBlockId?: string,
    onActiveBlockChange?: (blockId: string | null) => void,
};

const Editor = ({
    initialValue,
    onValueChange,
    onManualSave,
    autoFocus,
    activeBlockId,
    onActiveBlockChange,
}: EditorProps) => {
    const defaultValue = useMemo(() => fountainParser(''), []);
    const resolvedInitialValue = initialValue ?? defaultValue;
    const latestValueRef = useRef<Value>(resolvedInitialValue as Value);

    const plugins = useMemo(() => createFountainPlugins(), []);
    const editor = usePlateEditor({
        plugins,
        value: resolvedInitialValue as Value,
    });
    const initialFocusRef = useRef<string | null>(null);
    const suppressSelectionRef = useRef(false);
    const findPathById = useCallback((blockId: string) => {
        const entries = Node.nodes(editor, {
            at: [],
            match: node => Element.isElement(node) && (node as {id?: string}).id === blockId,
        });
        const first = entries.next();

        if (first.done || !first.value) {
            return null;
        }

        return first.value[1];
    }, [editor]);

    useEffect(() => {
        initialFocusRef.current = null;
    }, [resolvedInitialValue]);

    useEffect(() => {
        if (!activeBlockId || initialFocusRef.current === activeBlockId) {
            return;
        }

        suppressSelectionRef.current = true;

        if (editor.selection) {
            const blockEntry = editor.api.block({at: editor.selection});
            const selectedBlockId = (blockEntry?.[0] as {id?: string} | undefined)?.id;

            if (selectedBlockId === activeBlockId) {
                initialFocusRef.current = activeBlockId;
                suppressSelectionRef.current = false;

                return;
            }
        }

        const path = findPathById(activeBlockId);

        if (!path) {
            return;
        }

        try {
            const point = editor.api.start(path);

            editor.tf.select(point);
            initialFocusRef.current = activeBlockId;
            editor.tf.focus();
            requestAnimationFrame(() => {
                suppressSelectionRef.current = false;
            });
        } catch {
            // Ignore invalid paths.
            suppressSelectionRef.current = false;
        }
    }, [
        activeBlockId,
        editor,
        findPathById,
    ]);

    useEffect(() => {
        if (!onManualSave) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                onManualSave(latestValueRef.current as SlateValue);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onManualSave]);

    return (
        <div className={styles.root}>
            <Plate
                editor={editor}
                onValueChange={({value}) => {
                    latestValueRef.current = value;
                    onValueChange?.(value as SlateValue);
                }}
                onSelectionChange={({editor: plateEditor, selection}) => {
                    if (!onActiveBlockChange) {
                        return;
                    }

                    if (!selection) {
                        onActiveBlockChange(null);

                        return;
                    }

                    const blockEntry = plateEditor.api.block({at: selection});

                    if (!blockEntry) {
                        onActiveBlockChange(null);

                        return;
                    }

                    if (suppressSelectionRef.current) {
                        const [block] = blockEntry;
                        const blockId = (block as {id?: string}).id ?? null;

                        if (blockId && blockId === activeBlockId) {
                            suppressSelectionRef.current = false;
                        }

                        return;
                    }

                    const [block, path] = blockEntry;
                    let blockId = (block as {id?: string}).id ?? null;

                    if (!blockId) {
                        blockId = createNodeId();
                        editor.tf.setNodes({id: blockId}, {at: path});
                    }

                    onActiveBlockChange(blockId);
                }}
            >
                <EditorToolbar
                    onSave={onManualSave ? () => onManualSave(latestValueRef.current as SlateValue) : undefined}
                />
                <EditorCanvas renderLeaf={FountainLeaf} autoFocus={autoFocus} />
            </Plate>
        </div>
    );
};

export default Editor;
