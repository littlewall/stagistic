import {fountainParser} from '@stagistic/editor-core';
import {
    type SlateValue,
} from '@stagistic/shared';
import {type Value} from 'platejs';
import {Plate, usePlateEditor} from 'platejs/react';
import {
    useEffect,
    useMemo,
    useRef,
} from 'react';

import {EditorCanvas} from './components/EditorCanvas';
import EditorToolbar from './components/EditorToolbar';
import {createFountainPlugins} from './plugins/fountainPlugin';
import {FountainLeaf} from './utils/fountainMarks';

import styles from './Editor.module.css';

type EditorProps = {
    initialValue?: SlateValue,
    onValueChange?: (value: SlateValue) => void,
    onManualSave?: (value: SlateValue) => void,
    autoFocus?: boolean,
};

const Editor = ({
    initialValue,
    onValueChange,
    onManualSave,
    autoFocus,
}: EditorProps) => {
    const defaultValue = useMemo(() => fountainParser(''), []);
    const resolvedInitialValue = initialValue ?? defaultValue;
    const latestValueRef = useRef<Value>(resolvedInitialValue as Value);

    const plugins = useMemo(() => createFountainPlugins(), []);
    const editor = usePlateEditor({
        plugins,
        value: resolvedInitialValue as Value,
    });

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
