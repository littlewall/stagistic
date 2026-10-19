import {useEffect} from 'react';
import {flushSync} from 'react-dom';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import type {EditorLiveSnapshot} from '../contracts';
import {EditorSnapshotStoreProvider} from './context';
import {useEditorLiveSelector} from './hooks';
import {createEditorSnapshotStore, type EditorSnapshotStore} from './store';

type Selection = {label: string};
type Selector = (snapshot: EditorLiveSnapshot) => Selection;

const sameLabel = (previous: Selection, next: Selection) => previous.label === next.label;
const selectBlock: Selector = snapshot => ({label: snapshot.activeBlockId ?? 'none'});
const selectRevision: Selector = snapshot => ({label: String(snapshot.revision)});
const roots: Root[] = [];

const SelectionFixture = ({selector, onSelected}: {
    selector: Selector,
    onSelected: (selection: Selection) => void,
}) => {
    const selected = useEditorLiveSelector(selector, sameLabel);

    useEffect(() => onSelected(selected), [onSelected, selected]);

    return <span>{selected.label}</span>;
};

const mount = (store: EditorSnapshotStore) => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const onSelected = vi.fn<(selection: Selection) => void>();

    document.body.append(host);
    roots.push(root);

    const render = (nextStore = store, selector = selectBlock) => {
        flushSync(() => root.render(
            <EditorSnapshotStoreProvider store={nextStore}>
                <SelectionFixture selector={selector} onSelected={onSelected} />
            </EditorSnapshotStoreProvider>,
        ));
    };

    render();

    return {
        host,
        onSelected,
        render,
    };
};

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.replaceChildren();
});

describe('useEditorLiveSelector', () => {
    it('publishes selected changes and preserves equal selections across unrelated transactions', () => {
        const store = createEditorSnapshotStore();
        const {host, onSelected} = mount(store);

        expect(host.textContent).toBe('none');
        expect(onSelected).toHaveBeenCalledTimes(1);

        flushSync(() => store.patchSnapshot({revision: 1}));

        expect(onSelected).toHaveBeenCalledTimes(1);

        flushSync(() => store.patchSnapshot({activeBlockId: 'scene-one'}));

        expect(host.textContent).toBe('scene-one');
        expect(onSelected).toHaveBeenCalledTimes(2);
    });

    it('uses a replacement selector before the next store transaction', () => {
        const store = createEditorSnapshotStore();
        const {host, render} = mount(store);

        render(store, selectRevision);

        expect(host.textContent).toBe('0');

        flushSync(() => store.patchSnapshot({revision: 2}));

        expect(host.textContent).toBe('2');
    });

    it('switches stores and stops observing the old one', () => {
        const previous = createEditorSnapshotStore();
        const next = createEditorSnapshotStore();
        const {
            host,
            onSelected,
            render,
        } = mount(previous);

        next.patchSnapshot({activeBlockId: 'next'});
        render(next);

        expect(host.textContent).toBe('next');

        const callsBeforeOldUpdate = onSelected.mock.calls.length;

        flushSync(() => previous.patchSnapshot({activeBlockId: 'stale'}));

        expect(host.textContent).toBe('next');
        expect(onSelected).toHaveBeenCalledTimes(callsBeforeOldUpdate);

        flushSync(() => next.patchSnapshot({activeBlockId: 'updated'}));

        expect(host.textContent).toBe('updated');
    });
});
