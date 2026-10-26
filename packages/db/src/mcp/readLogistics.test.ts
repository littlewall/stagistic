import {parseStagistic} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {rebuildScriptProjection} from '../repo/document/documentProjection';
import {createTestDb, seedScript} from '../testing/createTestDb';
import {createLocalMcpReadService} from './createLocalMcpReadService';

describe('readStageLogistics', () => {
    it('detects character presence across scenes and flags quick-change risks', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 's');
        await rebuildScriptProjection({
            db,
            scriptId: 's',
            document: parseStagistic(`
# Act I

## Scene 1

@ALICE
Hello Bob.

@BOB
Hello Alice.

@ALICE
Goodbye Bob.

## Scene 2

@ALICE
I am already here!

@CHARLIE
Nice to meet you.
`).document,
        });

        const service = createLocalMcpReadService({getDb: () => Promise.resolve(db)});
        const result = await service.execute({
            tool: 'get_stage_logistics',
            arguments: {script_id: 's'},
        });

        expect(result.items.length).toBeGreaterThan(0);

        const item = result.items[0] as {
            scenes: Array<{
                scene_id: string,
                characters_present: Array<{character_key: string, speech_count: number}>,
            }>,
            quick_changes: Array<{
                character_key: string,
                from_scene_id: string,
                to_scene_id: string,
            }>,
        };

        expect(item.scenes).toHaveLength(2);
        expect(item.scenes[0].characters_present.map(c => c.character_key)).toContain('ALICE');
        expect(item.scenes[0].characters_present.map(c => c.character_key)).toContain('BOB');
        expect(item.scenes[1].characters_present.map(c => c.character_key)).toContain('ALICE');
        expect(item.scenes[1].characters_present.map(c => c.character_key)).toContain('CHARLIE');

        // Alice speaks at end of Scene 1 and immediately in Scene 2 (quick change)
        expect(item.quick_changes.some(qc => qc.character_key === 'ALICE')).toBe(true);
    });
});
