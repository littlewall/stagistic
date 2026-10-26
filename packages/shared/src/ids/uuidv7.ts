import {uuidv7 as uuidv7Generator} from 'uuidv7';

export const uuidv7 = () => {
    return uuidv7Generator();
};

const UUIDV7_PATTERN = /^([0-9a-f]{8})-([0-9a-f]{4})-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** Creation time (ms since epoch) encoded in a UUIDv7, or null for any other string. */
export const getUuidv7Timestamp = (id: string): number | null => {
    const match = UUIDV7_PATTERN.exec(id);

    return match ? Number.parseInt(`${match[1]}${match[2]}`, 16) : null;
};
