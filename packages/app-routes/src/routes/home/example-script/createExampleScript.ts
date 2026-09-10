import type {ScriptRepository} from '@stagistic/app-core';
import {linkCharacterRefInScriptDocument, type ScriptDocument} from '@stagistic/script';

import {loadExampleScriptTemplate} from './loadExampleScriptTemplate';

const INTEGRATED_SCORE_ROLE = 'integrated_score';

export interface ExampleScriptActions {
    createScript(title: string, document: ScriptDocument): Promise<string>,
    deleteScript(scriptId: string): Promise<void>,
}

interface CreateExampleScriptArgs {
    actions: ExampleScriptActions,
    repository: Pick<
        ScriptRepository,
        | 'allocateScriptCharacterId'
        | 'confirmScriptCharacterWithId'
        | 'saveLatest'
        | 'saveTitlePage'
        | 'setMusicAttachment'
        | 'removeMusicAttachment'
    >,
}

interface CreatedExampleScript {
    scriptId: string,
    title: string,
}

export const createExampleScript = async ({
    actions,
    repository,
}: CreateExampleScriptArgs): Promise<CreatedExampleScript> => {
    const template = await loadExampleScriptTemplate();
    const scriptId = await actions.createScript(template.title, template.document);
    let scoreAttached = false;

    try {
        let linkedDocument = template.document;

        for (const characterKey of template.characterKeys) {
            const characterId = repository.allocateScriptCharacterId();
            const character = await repository.confirmScriptCharacterWithId(scriptId, {
                id: characterId,
                key: characterKey,
            });

            if (!character) {
                throw new Error(`Example character could not be created: ${characterKey}.`);
            }

            linkedDocument = linkCharacterRefInScriptDocument(
                linkedDocument,
                characterKey,
                character.id,
            ).value;
        }

        await repository.saveLatest(scriptId, linkedDocument);
        await repository.setMusicAttachment(
            scriptId,
            template.scoreMusicId,
            INTEGRATED_SCORE_ROLE,
            template.score,
        );
        scoreAttached = true;
        await repository.saveTitlePage(scriptId, template.titlePage);

        return {scriptId, title: template.title};
    } catch (error) {
        if (scoreAttached) {
            await repository.removeMusicAttachment(
                scriptId,
                template.scoreMusicId,
                INTEGRATED_SCORE_ROLE,
            ).catch(() => undefined);
        }

        await actions.deleteScript(scriptId).catch(() => undefined);
        throw error;
    }
};
