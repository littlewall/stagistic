import {
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';

import {Text} from '../primitives/Text/Text';
import {ArcsChart} from './ArcsChart';
import {createArcsLayout} from './arcsGeometry';
import {ArcsLegend} from './ArcsLegend';
import type {BoardArcsProps} from './arcsTypes';
import styles from './BoardArcs.module.css';
import {useSceneNumbers} from './useSceneNumbers';

export type {
    BoardArcsAct,
    BoardArcsArc,
    BoardArcsEditing,
    BoardArcsPoint,
    BoardArcsProps,
    BoardArcsScene,
} from './arcsTypes';

/*
 * The Arcs lens: one arc per character over evenly spread scenes, with a legend that
 * switches between the overview and a single active character. Act names wrap instead of
 * clipping and the act band grows to fit them; the plot's height is bounded and its
 * baseline is the single neutral level. With the write callbacks the active character's
 * points can be added, moved, dragged and removed; without them the chart only highlights.
 */
export const BoardArcs = ({
    acts,
    arcs,
    onSetPoint,
    onRemovePoint,
    characterActions,
}: BoardArcsProps) => {
    const plotRef = useRef<HTMLDivElement | null>(null);
    const legendRef = useRef<HTMLUListElement>(null);
    const [size, setSize] = useState({width: 0, height: 0});
    const numbersRef = useRef<HTMLDivElement>(null);
    const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(() => new Set());
    const visibleArcs = arcs.filter(arc => !hiddenIds.has(arc.id));
    const [selectedCharacterId, setActiveCharacterId] = useState<string | null>(null);
    /* A filter that hides the active character returns the chart to the overview. */
    const activeCharacterId = visibleArcs.some(arc => arc.id === selectedCharacterId) ? selectedCharacterId : null;

    /* Forget the hidden selection now, so the character is not reactivated when the filter shows it again. */
    if (selectedCharacterId !== null && activeCharacterId === null) setActiveCharacterId(null);

    /* The plot is absent while there are no characters, so the observer follows the element. */
    const observerRef = useRef<ResizeObserver | null>(null);
    const attachPlot = useCallback((element: HTMLDivElement | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        plotRef.current = element;

        if (!element) return;

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];

            if (!entry) return;

            const {width, height} = entry.contentRect;

            setSize(previous => (previous.width === width && previous.height === height ? previous : {width, height}));
        });

        observer.observe(element);
        observerRef.current = observer;
    }, []);

    const scenes = useMemo(() => acts.flatMap(act => act.scenes), [acts]);
    const layout = useMemo(
        () => createArcsLayout(size.width, size.height, scenes.length),
        [
            size.width,
            size.height,
            scenes.length,
        ],
    );
    const numberIndices = useSceneNumbers(numbersRef, scenes, size.width, arcs.length > 0);

    if (arcs.length === 0) {
        return <Text as="p" variant="muted" size="sm">No characters yet.</Text>;
    }

    /* Where one act ends and the next begins, in scene columns. */
    const actBoundaries: number[] = [];
    let scenesBefore = 0;

    acts.forEach((act, actIndex) => {
        if (actIndex > 0) actBoundaries.push(scenesBefore);

        scenesBefore += act.scenes.length;
    });

    /* Back to the overview, with the focus on the legend item the chart was editing. */
    const leaveCharacter = () => {
        const leaving = activeCharacterId;

        setActiveCharacterId(null);

        if (leaving) {
            requestAnimationFrame(() => legendRef.current?.querySelector<HTMLElement>(`[data-arc-id="${leaving}"]`)?.focus());
        }
    };

    return (
        <div className={styles.arcs}>
            <div className={styles.chartArea}>
                {actBoundaries.map(boundary => (
                    <div key={boundary} className={styles.actDivider} style={{left: `${(boundary / scenes.length) * 100}%`}} data-act-divider aria-hidden="true" />
                ))}
                <div className={styles.actBand} aria-hidden="true">
                    {acts.map(act => (
                        <div
                            key={act.key}
                            className={styles.act}
                            style={{flexGrow: act.scenes.length}}
                            data-act={act.name}
                        >
                            <Text as="span" variant="eyebrow" size="xs" className={styles.actName}>{act.name}</Text>
                        </div>
                    ))}
                </div>
                <div ref={numbersRef} className={styles.sceneNumbers} aria-hidden="true">
                    {numberIndices.map(index => (
                        <span
                            key={scenes[index].headingBlockId}
                            data-scene-number={scenes[index].number}
                            className={styles.sceneNumber}
                            style={{left: layout.sceneX(index)}}
                        >
                            {scenes[index].number}
                        </span>
                    ))}
                </div>
                <ArcsChart
                    plotRef={plotRef}
                    attachPlot={attachPlot}
                    layout={layout}
                    scenes={scenes}
                    arcs={visibleArcs}
                    activeCharacterId={activeCharacterId}
                    onActivate={setActiveCharacterId}
                    onEscape={leaveCharacter}
                    onSetPoint={onSetPoint}
                    onRemovePoint={onRemovePoint}
                    characterActions={characterActions}
                />
            </div>
            <ArcsLegend
                ref={legendRef}
                arcs={arcs}
                hiddenIds={hiddenIds}
                onToggle={id => setHiddenIds(previous => {
                    const next = new Set(previous);

                    if (next.has(id)) next.delete(id);
                    else next.add(id);

                    return next;
                })}
            />
        </div>
    );
};
