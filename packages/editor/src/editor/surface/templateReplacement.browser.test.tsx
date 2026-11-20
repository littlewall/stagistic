import '@stagistic/ui/styles/base.css';

import {getFormatTemplate, type ScriptDocument} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import ScriptEditor from '../Editor';
import {createEditorSurfaceCache, type EditorSurfaceCache} from './editorSurfaceCache';

const initialValue: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'scene-1'},
            content: [{type: 'text', text: 'A room'}],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'direction-1'},
            content: [
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'song-1',
                        mode: 'open',
                        title: 'Opening',
                        isDraft: false,
                        kind: null,
                    },
                },
                {type: 'text', text: 'The music begins.'},
            ],
        },
        {
            type: 'dialogue',
            attrs: {id: 'dialogue-1'},
            content: [{type: 'text', text: 'Good evening.'}],
        },
    ],
};

let root: Root | null = null;
let cache: EditorSurfaceCache | undefined;

afterEach(() => {
    root?.unmount();
    cache?.destroy();
    root = null;
    cache = undefined;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

const Harness = () => {
    const [musical, setMusical] = useState(false);

    return (
        <>
            <button onClick={() => setMusical(value => !value)}>Change template</button>
            <ScriptEditor
                document={{initialValue}}
                settings={{scriptSettings: requireValue(getFormatTemplate(musical ? 'dg-musical' : 'samuel-french')).settings}}
                layout={{autoFocus: false}}
                surfaceCache={cache}
            />
        </>
    );
};

it.each([true, false])('changes templates without React or detached-view errors (cache: %s)', async useCache => {
    const consoleErrors = vi.spyOn(console, 'error');

    cache = useCache ? createEditorSurfaceCache() : undefined;

    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness />);
    await expect.poll(() => document.querySelector('[data-scene-collapse-trigger]')).toBeTruthy();
    await expect.poll(() => document.querySelector('[data-music-rail-boundary]')).toBeTruthy();

    for (let index = 0; index < 3; index += 1) {
        const previous = document.querySelector('[data-editor]');

        await userEvent.click(requireValue(document.querySelector('button')));
        await expect.poll(() => document.querySelector('[data-editor]')).not.toBe(previous);
        await expect.poll(() => document.querySelector('[data-scene-collapse-trigger]')).toBeTruthy();
        await expect.poll(() => document.querySelector('[data-music-rail-boundary]')).toBeTruthy();
        expect(document.querySelector('[data-editor]')?.textContent).toContain('Good evening.');
    }

    expect(consoleErrors.mock.calls).toEqual([]);
});

it('ignores queued overlay measurements after the cached editor is destroyed', async () => {
    cache = createEditorSurfaceCache();

    const host = document.createElement('div');
    const errors: string[] = [];
    const onError = (event: ErrorEvent) => errors.push(event.message);

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness />);
    await expect.poll(() => document.querySelector('[data-scene-collapse-trigger]')).toBeTruthy();
    await expect.poll(() => document.querySelector('[data-music-rail-boundary]')).toBeTruthy();
    window.addEventListener('error', onError);

    try {
        window.dispatchEvent(new Event('resize'));
        cache.destroy();
        await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
        expect(errors).toEqual([]);
    } finally {
        window.removeEventListener('error', onError);
    }
});
