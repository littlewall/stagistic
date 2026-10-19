import {type BlockNodeType} from '../../../tiptap/scriptCore';

export const isCharacterBlockType = (value: BlockNodeType) => {
    return value === 'character';
};
