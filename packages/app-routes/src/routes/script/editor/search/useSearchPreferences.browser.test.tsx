import {flushSync} from 'react-dom';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {getSearchBlockTypesKey, useSearchPreferences} from './useSearchPreferences';

const roots: Root[] = [];
let latest: ReturnType<typeof useSearchPreferences> | null = null;

const Probe = ({scriptScope}: {scriptScope: string}) => {
    latest = useSearchPreferences(scriptScope);

    return null;
};

const mount = (scriptScope: string) => {
    const root = createRoot(document.body.appendChild(document.createElement('div')));

    flushSync(() => root.render(<Probe scriptScope={scriptScope} />));
    roots.push(root);

    return root;
};

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.innerHTML = '';
    window.localStorage.clear();
    latest = null;
});

describe('useSearchPreferences', () => {
    it('defaults to no filter', () => {
        mount('script-1');

        expect(latest?.blockTypes).toEqual([]);
    });

    it('persists the block filter per script across remounts', () => {
        const root = mount('script-1');

        flushSync(() => latest?.onBlockTypesChange(['dialogue', 'lyrics']));
        root.unmount();
        roots.splice(0);

        mount('script-1');
        expect(latest?.blockTypes).toEqual(['dialogue', 'lyrics']);

        mount('script-2');
        expect(latest?.blockTypes).toEqual([]);
    });

    it('drops unknown block types from stored data', () => {
        window.localStorage.setItem(getSearchBlockTypesKey('script-1'), JSON.stringify([
            'dialogue',
            'heading',
            3,
        ]));

        mount('script-1');

        expect(latest?.blockTypes).toEqual(['dialogue']);
    });
});
