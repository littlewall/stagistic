import {listSceneCharacters, listSceneSynopses} from '../queries/scripts/sceneCharacters';
import {createPgliteReactiveQuerySource} from '../reactive';
import {createScriptSourceRegistry} from './createScriptSourceRegistry';
import type {GetDb} from './types';

export const createSceneMetadataSources = (getDb: GetDb) => ({
    getScriptSceneCharactersSource: createScriptSourceRegistry(scriptId => createPgliteReactiveQuerySource({
        getDb,
        readRows: async () => listSceneCharacters(await getDb(), scriptId),
        watchQuery: `SELECT characters.* FROM script_scene_characters AS characters
            WHERE characters.script_id = $1 AND EXISTS (
                SELECT 1 FROM script_scenes AS scenes
                WHERE scenes.script_id = characters.script_id AND scenes.heading_block_id = characters.heading_block_id
            )`,
        watchParams: [scriptId],
    })),
    getScriptSceneSynopsesSource: createScriptSourceRegistry(scriptId => createPgliteReactiveQuerySource({
        getDb,
        readRows: async () => listSceneSynopses(await getDb(), scriptId),
        watchQuery: 'SELECT heading_block_id, synopsis FROM script_scenes WHERE script_id = $1',
        watchParams: [scriptId],
    })),
});
