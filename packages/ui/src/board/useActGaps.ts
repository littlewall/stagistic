import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import type {BoardMatrixAct} from './BoardMatrix';

/*
 * An act name wider than its scene columns buys a gap column after the act's last scene,
 * so the name never clips and the dots keep their fixed pitch. The widths are read from
 * the rendered table: neither the name's box nor the scene columns move when a gap is
 * applied, which keeps the measurement stable instead of feeding back into itself.
 */
export const useActGaps = (acts: readonly BoardMatrixAct[]) => {
    const [actGaps, setActGaps] = useState<number[]>(() => acts.map(() => 0));
    const gridRef = useRef<HTMLTableElement>(null);

    const measureActGaps = useCallback(() => {
        const table = gridRef.current;

        if (!table) return;

        const actHeaders = [...table.querySelectorAll<HTMLElement>('[data-act]')];
        const sceneHeaders = [...table.querySelectorAll<HTMLElement>('[data-scene-number]')];
        let sceneCursor = 0;

        const nextGaps = acts.map((act, actIndex) => {
            const nameSpan = actHeaders[actIndex]?.querySelector<HTMLElement>('span');
            const lastSceneHeader = sceneHeaders[sceneCursor + act.scenes.length - 1];

            sceneCursor += act.scenes.length;

            if (!nameSpan || !lastSceneHeader) return 0;

            const overflow = nameSpan.getBoundingClientRect().right - lastSceneHeader.getBoundingClientRect().right;

            return Math.max(0, Math.ceil(overflow));
        });

        setActGaps(previous => (previous.length === nextGaps.length && previous.every((gap, index) => gap === nextGaps[index])
            ? previous
            : nextGaps));
    }, [acts]);

    useLayoutEffect(() => {
        measureActGaps();
    }, [measureActGaps]);

    /* Font swaps and zoom change the name's width and the rem-based columns alike. */
    useEffect(() => {
        const remeasure = () => measureActGaps();
        let isMounted = true;

        window.addEventListener('resize', remeasure);
        void document.fonts?.ready.then(() => {
            if (isMounted) remeasure();
        });

        return () => {
            isMounted = false;
            window.removeEventListener('resize', remeasure);
        };
    }, [measureActGaps]);

    return {
        actGaps,
        gridRef,
    };
};
