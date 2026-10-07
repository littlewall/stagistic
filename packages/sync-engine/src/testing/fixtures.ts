import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import type * as Y from 'yjs';

import {BODY_FIELD} from '../ydoc/bodyCodec';

export const block = (type: string, id: string, text = '', marks?: ScriptNode['marks']): ScriptNode => ({
    type,
    attrs: {id},
    ...text ? {content: [
        {
            type: 'text',
            text,
            ...marks ? {marks} : {},
        },
    ]} : {},
});

export const doc = (...content: ScriptNode[]): ScriptDocument => ({type: 'doc', content});

/** Act + `sceneCount` scenes with `linesPerScene` dialogue lines each. */
export const buildLongScript = (sceneCount: number, linesPerScene: number, prefix = 'b'): ScriptDocument => {
    const content: ScriptNode[] = [block('act', `${prefix}-act`, 'ACT ONE')];

    for (let scene = 0; scene < sceneCount; scene++) {
        content.push(block('scene', `${prefix}-s${scene}`, `SCENE ${scene + 1}`));

        for (let line = 0; line < linesPerScene; line++) {
            content.push(block('character', `${prefix}-s${scene}-c${line}`, line % 2 ? 'HAMLET' : 'OPHELIA'));
            content.push(block('dialogue', `${prefix}-s${scene}-d${line}`, `Line ${line} of scene ${scene}: to be, or not to be, that is the question.`));
        }
    }

    return doc(...content);
};

/** The Y.XmlText inside the top-level block at `index`. */
export const blockText = (ydoc: Y.Doc, index: number) => (ydoc.getXmlFragment(BODY_FIELD).get(index) as Y.XmlElement).get(0) as Y.XmlText;
