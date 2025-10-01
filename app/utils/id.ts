import {nanoid} from 'nanoid';

export const generateId = (size?: number): string => {
    return nanoid(size);
};
