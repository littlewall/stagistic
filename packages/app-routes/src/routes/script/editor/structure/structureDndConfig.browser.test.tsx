import {DragDropProvider} from '@dnd-kit/react';
import {useSortable} from '@dnd-kit/react/sortable';
import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {SCENE_DND_TYPE} from './dnd';
import {configuredKeyboardSensor} from './structureDndConfig';
import {ROOT_ACT_GROUP, type StructureGroup} from './structureRows';
import {useStructureSidebarDnd} from './useStructureSidebarDnd';

const mountedRoots: Root[] = [];

const groups: StructureGroup[] = [
    {
        groupId: ROOT_ACT_GROUP,
        actName: null,
        scenes: [
            {
                blockId: 'scene-1', title: 'First scene', sceneNumber: 1,
            }, {
                blockId: 'scene-2', title: 'Second scene', sceneNumber: 2,
            },
        ],
    },
];

const waitFor = async (predicate: () => boolean, label: string) => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const SceneHandle = ({blockId, index}: {blockId: string, index: number}) => {
    const {ref, handleRef} = useSortable({
        id: blockId,
        index,
        group: ROOT_ACT_GROUP,
        type: SCENE_DND_TYPE,
        accept: [SCENE_DND_TYPE],
        feedback: 'clone',
    });

    return (
        <li ref={ref}>
            <button
                ref={handleRef}
                type="button"
                aria-label={`Drag ${blockId}`}
            />
        </li>
    );
};

const KeyboardReorder = () => {
    const [result, setResult] = useState<string | null>(null);
    const onDragEnd = useStructureSidebarDnd({
        groups,
        onReorderScene: (sourceSceneBlockId, beforeBlockId) => {
            setResult(`${sourceSceneBlockId}:${beforeBlockId}`);
        },
    });

    return (
        <DragDropProvider
            onDragEnd={onDragEnd}
            sensors={() => [configuredKeyboardSensor] as never}
        >
            <ul>
                {groups[0].scenes.map((scene, index) => (
                    <SceneHandle
                        key={scene.blockId}
                        blockId={scene.blockId}
                        index={index}
                    />
                ))}
            </ul>
            <output data-testid="result">{result}</output>
        </DragDropProvider>
    );
};

const mount = () => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(<KeyboardReorder />);
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('structure keyboard drag and drop', () => {
    it('moves a scene up with Space and ArrowUp', async () => {
        mount();

        await waitFor(
            () => document.querySelector('button[aria-label="Drag scene-2"]') !== null,
            'scene drag handle',
        );

        const handle = document.querySelector<HTMLButtonElement>('button[aria-label="Drag scene-2"]')!;

        handle.focus();
        await userEvent.keyboard('{Space}{ArrowUp}{Space}');

        await waitFor(
            () => document.querySelector('[data-testid="result"]')?.textContent === 'scene-2:scene-1',
            'scene reorder',
        );
        await waitFor(
            () => document.activeElement === handle,
            'drag handle focus restoration',
        );

        expect(document.activeElement).toBe(handle);
    });
});
