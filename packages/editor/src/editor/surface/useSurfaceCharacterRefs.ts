import {useState} from 'react';

import {
    type CharacterColorRefsBundle,
    createCharacterColorRefsBundle,
    type EditorSurfaceCache,
} from './editorSurfaceCache';

/** Keep the color bundle captured by the surface's extension closures for its entire mount. */
export const useSurfaceCharacterRefs = (cache: EditorSurfaceCache | undefined, signature: string) => {
    const [refs] = useState<CharacterColorRefsBundle>(() => {
        return cache?.acquire(signature)?.characterColorRefs ?? createCharacterColorRefsBundle();
    });

    return refs;
};
