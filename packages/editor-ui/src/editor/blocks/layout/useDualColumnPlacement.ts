import {
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    type FountainElementType,
    shouldSuppressCharacterGap,
} from '@stagistic/editor-core';
import {
    useEditorRef,
    usePath,
    useValueVersion,
} from 'platejs/react';
import type {CSSProperties} from 'react';
import {useMemo} from 'react';

type DualPlacement = {
    className?: string,
    style?: CSSProperties,
};

const useDualColumnPlacement = (type: FountainElementType): DualPlacement => {
    const editor = useEditorRef();
    const path = usePath();
    const valueVersion = useValueVersion();

    return useMemo(() => {
        const gapStyle =
      (type === ELEMENT_CHARACTER || type === ELEMENT_DUAL_DIALOGUE_CHARACTER) &&
      shouldSuppressCharacterGap(editor, path)
          ? {['--character-gap' as const]: '0px'}
          : undefined;

        return {style: gapStyle as CSSProperties};
    }, [
        editor,
        path,
        type,
        valueVersion,
    ]);
};

export default useDualColumnPlacement;
