import type {StepkgAttachmentSnapshot} from './contracts';

const unsafeAttachmentId = /[^A-Za-z0-9._-]/;
const unsafeFilename = /[<>:"/\\|?*]/g;

const replaceControlCharacters = (value: string): string => {
    let result = '';
    for (let index = 0; index < value.length; index += 1) {
        const character = value[index];
        result += character.charCodeAt(0) < 32 ? '-' : character;
    }
    return result;
};

export const isSafeStepkgAttachmentId = (id: string): boolean => id.length > 0 && !unsafeAttachmentId.test(id);

export const isSafeStepkgPath = (path: string): boolean => {
    if (path.length === 0 || path.startsWith('/') || path.includes('\\')) {
        return false;
    }

    return path.split('/').every(segment => segment.length > 0 && segment !== '.' && segment !== '..');
};

export const getStepkgAssetPath = ({id, filename}: Pick<StepkgAttachmentSnapshot, 'id' | 'filename'>): string => {
    const leaf = replaceControlCharacters(filename.split(/[\\/]/).at(-1) ?? '').replace(unsafeFilename, '-');
    const safeLeaf = leaf.length > 0 && leaf !== '.' && leaf !== '..' ? leaf : 'attachment';

    return `assets/${id}/${safeLeaf}`;
};
