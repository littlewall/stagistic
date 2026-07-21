import type {NodeViewProps} from '@tiptap/react';
import {
    type FocusEvent,
    type RefObject,
    useEffect,
    useRef,
    useState,
} from 'react';

export type MusicPillRole = 'start' | 'out';

export const usePillActivation = () => {
    const [active, setActive] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!active) {
            return undefined;
        }

        const onPointerDown = (event: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
                setActive(false);
            }
        };

        document.addEventListener('mousedown', onPointerDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
        };
    }, [active]);

    return {
        active,
        setActive,
        rootRef,
    };
};

export const normalizeMusicTitle = (value: unknown) => {
    return typeof value === 'string' ? value : '';
};

export const handleFocusWithin = (setActive: (active: boolean) => void) => {
    return () => setActive(true);
};

export const handleBlurWithin = (
    rootRef: RefObject<HTMLSpanElement | null>,
    setActive: (active: boolean) => void,
) => {
    return (event: FocusEvent<HTMLSpanElement>) => {
        const nextTarget = event.relatedTarget;

        if (nextTarget instanceof Node && rootRef.current?.contains(nextTarget)) {
            return;
        }

        setActive(false);
    };
};

export const readDecorationLabel = (
    decorations: NodeViewProps['decorations'],
    key: string,
): string => {
    for (const decoration of decorations) {
        const value = (decoration.spec as Record<string, unknown> | undefined)?.[key];

        if (typeof value === 'string') {
            return value;
        }
    }

    return '';
};

export const findMusicPillElement = (
    editor: NodeViewProps['editor'],
    role: MusicPillRole,
    musicId: string,
) => {
    const pills = editor.view.dom.querySelectorAll<HTMLElement>(`[data-music-pill="${role}"]`);

    return Array.from(pills).find(pill => pill.dataset.musicId === musicId) ?? null;
};

export const scrollToMusicPill = (
    editor: NodeViewProps['editor'],
    role: MusicPillRole,
    musicId: string,
) => {
    const pill = findMusicPillElement(editor, role, musicId);

    if (!pill) {
        return false;
    }

    pill.scrollIntoView({
        block: 'center',
        inline: 'nearest',
    });

    return true;
};
