import { useMemo, useState } from 'react';
import type { Descendant } from 'platejs';
import type { Value } from 'platejs';
import { parseFountain, serializeFountain } from '@stagistic/editor-core';
import { EditorCanvas } from './components/EditorCanvas';
import { EditorToolbar } from './components/EditorToolbar';
import { fountainPlugins } from './plugins';
import { EditorLayout } from './ui/EditorLayout';
import './styles/editor.css';
import { Plate, usePlateEditor } from 'platejs/react';

const fountainSample = `
INT. THEATRE LOBBY - NIGHT

The old clock ticks. The lobby is quiet.

JAMIE
(whispering)
We should have left an hour ago.

TAYLOR^
We wait. The show always starts late.

>A hush settles across the room<

~Humming a tune in the dark

CUT TO:`;

export default function Editor() {
    const plugins = useMemo(
        () => [...fountainPlugins],
        []
    );

    const initialValue = useMemo(() => parseFountain(fountainSample), []);
    const [value, setValue] = useState<Descendant[]>(
        () => initialValue as unknown as Descendant[]
    );
    const editor = usePlateEditor({
        plugins,
        value: initialValue as unknown as Value,
    });
    const preview = useMemo(() => serializeFountain(value as any), [value]);

    return (
        <div className="editor-root">
            <EditorLayout
                header={<EditorToolbar />}
                sidebar={
                    <aside className="editor-sidebar">
                        <h2>Preview</h2>
                        <p>Line-based Fountain output (inline emphasis later).</p>
                        <pre className="editor-preview">{preview || 'No content yet.'}</pre>
                    </aside>
                }
                footer={<div className="editor-footer">Fountain blocks: {value.length}</div>}
            >
                <Plate
                    editor={editor}
                    onChange={({ value: nextValue }: { value: Value }) =>
                        setValue(nextValue as Descendant[])
                    }
                >
                    <EditorCanvas />
                </Plate>
            </EditorLayout>
        </div>
    );
}
