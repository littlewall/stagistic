import {DragDropProvider} from '@dnd-kit/react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {StructureRowScene} from './StructureRowScene';

let root: Root | null = null;

const renderRow = async (isReadOnly: boolean) => {
    const host = document.createElement('ul');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <DragDropProvider>
            <StructureRowScene
                blockId="scene-1"
                title="Storm is coming"
                sceneNumber={1}
                index={0}
                groupId="root"
                isActive={false}
                isReadOnly={isReadOnly}
                onFocus={() => undefined}
            />
        </DragDropProvider>,
    );

    const deadline = Date.now() + 1000;

    while (!host.querySelector('li') && Date.now() < deadline) {
        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    return host;
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('StructureRowScene', () => {
    it('offers a drag handle in the editable script', async () => {
        const host = await renderRow(false);

        expect(host.querySelector('[aria-label="Drag scene"]')).not.toBeNull();
        expect(host.querySelector('li')?.children).toHaveLength(2);
    });

    it('renders no drag handle for a stored, read-only state', async () => {
        const host = await renderRow(true);

        expect(host.querySelector('[aria-label="Drag scene"]')).toBeNull();
        expect(host.querySelector('li')?.children).toHaveLength(1);
    });
});
