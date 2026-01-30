import { useMemo, useState } from 'react';
import type { Descendant } from 'platejs';
import type { Value } from 'platejs';
import { parseFountain, serializeFountain } from '@stagistic/editor-core';
import { EditorCanvas } from './components/EditorCanvas';
import { EditorToolbar } from './components/EditorToolbar';
import { fountainPlugins } from './plugins';
import { AppHeader, AppLayout, EditorSidebar } from '@stagistic/ui';
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

const mockProjects = [
    { id: '1', name: 'The Last Light' },
    { id: '2', name: 'Midnight Express' },
    { id: '3', name: 'Summer Solstice' },
    { id: '4', name: "Winter's Tale" },
];

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
    const [currentProject, setCurrentProject] = useState(mockProjects[0]);

    const recentProjects = useMemo(
        () => mockProjects.filter((project) => project.id !== currentProject.id).slice(0, 3),
        [currentProject]
    );

    const scenes = useMemo(() => {
        const lines = preview.split('\n');
        const scenePattern = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+.+/i;

        return lines
            .map((line, index) => ({ line: line.trim(), lineNumber: index }))
            .filter(({ line }) => scenePattern.test(line))
            .map(({ line, lineNumber }, index) => ({
                id: `scene-${index}`,
                heading: line,
                lineNumber,
            }));
    }, [preview]);

    return (
        <AppLayout
            header={
                <AppHeader
                    currentProject={currentProject}
                    recentProjects={recentProjects}
                    onSelectProject={setCurrentProject}
                />
            }
            sidebar={<EditorSidebar scenes={scenes} onSceneClick={() => {}} />}
        >
            <EditorToolbar />
            <Plate
                editor={editor}
                onChange={({ value: nextValue }: { value: Value }) =>
                    setValue(nextValue as Descendant[])
                }
            >
                <EditorCanvas />
            </Plate>
        </AppLayout>
    );
}
