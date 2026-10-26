import {parseStagistic} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {rebuildScriptProjection} from '../repo/document/documentProjection';
import {createTestDb, seedScript} from '../testing/createTestDb';
import {createLocalMcpReadService} from './createLocalMcpReadService';

describe('readSceneTelemetry', () => {
    it('computes word counts, speech breakdown and dialogue dynamics for a scene', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's');
        await rebuildScriptProjection({
            db,
            scriptId: 's',
            document: parseStagistic(`
# Act I

## Scene 1

@ALICE
One two three four.

@BOB
Five six.
`).document,
        });

        const service = createLocalMcpReadService({getDb: () => Promise.resolve(db)});
        const outline = await service.execute({
            tool: 'get_script_outline',
            arguments: {script_id: 's'},
        });
        const sceneItem = outline.items.find(i => typeof i === 'object' && i && 'kind' in i && i.kind === 'scene') as {id: string};

        const result = await service.execute({
            tool: 'get_scene_telemetry',
            arguments: {script_id: 's', scene_id: sceneItem.id},
        });

        expect(result.items.length).toBeGreaterThan(0);

        const telemetry = result.items[0] as {
            scene_id: string,
            total_words: number,
            total_speeches: number,
            characters: Array<{
                character_key: string,
                speech_count: number,
                word_count: number,
            }>,
        };

        expect(telemetry.scene_id).toBe(sceneItem.id);
        expect(telemetry.total_speeches).toBe(2);
        expect(telemetry.total_words).toBe(6);
        expect(telemetry.characters).toHaveLength(2);

        const alice = telemetry.characters.find(c => c.character_key === 'ALICE');

        expect(alice?.speech_count).toBe(1);
        expect(alice?.word_count).toBe(4);
    });
});
