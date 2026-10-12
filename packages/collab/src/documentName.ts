import type {RecordsKind} from '@stagistic/sync-engine';

/** Y.Doc kinds per script; names match the client engine (`script/{id}/{kind}`). */
export type DocumentKind = 'body' | RecordsKind;

const DOCUMENT_NAME = /^script\/([A-Za-z0-9_-]{1,64})\/(body|meta|comments)$/;

export const SCRIPT_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const parseDocumentName = (name: string): {scriptId: string, kind: DocumentKind} | null => {
    const match = DOCUMENT_NAME.exec(name);

    return match ? {scriptId: match[1], kind: match[2] as DocumentKind} : null;
};
