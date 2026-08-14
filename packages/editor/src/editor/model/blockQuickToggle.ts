import type {ScriptBlockNodeType} from '@stagistic/script';

const quickToggleTargetByType: Partial<Record<ScriptBlockNodeType, ScriptBlockNodeType>> = {
    character: 'stageDirection',
    dialogue: 'lyrics',
    lyrics: 'dialogue',
    stageDirection: 'character',
};

export const getBlockQuickToggleTarget = (
    blockType: ScriptBlockNodeType,
): ScriptBlockNodeType | null => quickToggleTargetByType[blockType] ?? null;
