import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import * as Y from 'yjs';

import {buildLongScript} from '../testing/fixtures';
import {
    bodyDocToScriptDocument,
    replaceBodyContent,
    seedBodyDoc,
} from '../ydoc/bodyCodec';
import {getMetaMap, replaceMapContent} from '../ydoc/mapCodec';
import {replaceOnCloudState} from './replaceOnCloudState';

describe('replaceOnCloudState', () => {
    it('sends only replacement ops and converges a third client without duplicates', () => {
        const cloud = new Y.Doc();

        seedBodyDoc(cloud, buildLongScript(4, 2, 'cloud'));
        getMetaMap(cloud).set('title', 'Cloud title');
        getMetaMap(cloud).set('stale', true);

        const thirdClient = new Y.Doc();

        Y.applyUpdate(thirdClient, Y.encodeStateAsUpdate(cloud));

        // Diverged local copy of the same script (built from its own history).
        const localJson = buildLongScript(2, 5, 'local');
        const replacement = replaceOnCloudState(Y.encodeStateAsUpdate(cloud), scratch => {
            replaceBodyContent(scratch, localJson);
            replaceMapContent(getMetaMap(scratch), {title: 'Local title'});
        });

        // Server receives only the diff; the third client gets it from the server.
        Y.applyUpdate(cloud, replacement.update);
        Y.applyUpdate(thirdClient, Y.encodeStateAsUpdate(cloud, Y.encodeStateVector(thirdClient)));

        expect(bodyDocToScriptDocument(thirdClient)).toEqual(localJson);
        expect(getMetaMap(thirdClient).toJSON()).toEqual({title: 'Local title'});
        expect(replacement.update.byteLength).toBeLessThan(Y.encodeStateAsUpdate(cloud).byteLength);
        expect(Y.encodeStateAsUpdate(replacement.doc)).toEqual(Y.encodeStateAsUpdate(cloud));
    });
});
