import type {CSSProperties} from 'react';

import {CharacterDot} from './BoardCharacterDot';
import type {BoardMatrixCell} from './BoardMatrix';
import styles from './BoardMatrix.module.css';

/* The square of a noted cell; the dot kinds reuse the card chip's dot. */
export const CellGlyph = ({cell}: {cell: BoardMatrixCell}) => {
    if (cell.kind !== 'note') {
        return cell.chip ? <CharacterDot chip={cell.chip} /> : null;
    }

    return <span className={styles.noteGlyph} style={{'--chip-color': cell.chip?.color ?? undefined} as CSSProperties} />;
};
