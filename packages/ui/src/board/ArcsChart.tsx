import type {RefObject} from 'react';
import {useEffect, useState} from 'react';

import {ArcMarker} from './ArcMarker';
import {ArcsAnchors} from './ArcsAnchors';
import {arcCurvePoints} from './arcsCurve';
import {
    type ArcsLayout,
    buildMonotonePath,
    POINT_RADIUS,
} from './arcsGeometry';
import {ArcsGhost} from './ArcsGhost';
import {pointLabel} from './arcsLabels';
import {ArcsPointPopover} from './ArcsPointPopover';
import {ArcsPresence} from './ArcsPresence';
import type {
    BoardArcsArc,
    BoardArcsEditing,
    BoardArcsPoint,
    BoardArcsScene,
} from './arcsTypes';
import styles from './BoardArcs.module.css';
import {useArcsPointer} from './useArcsPointer';
import {useArcsStops} from './useArcsStops';
import {useArcsTooltip} from './useArcsTooltip';

const STROKE_WIDTH = 2;
/** The keyboard focus ring around a stop's point, or around its spot on the baseline. */
const STOP_RING_RADIUS = POINT_RADIUS + 4;

/*
 * The plot: baseline, act dividers, the arcs and their points, the tooltips, and for an
 * editable Board the active character's editing surface (a click column and one roving
 * tab stop per scene, a ghost under the cursor, draggable points and the point popover).
 */
export const ArcsChart = ({
    plotRef,
    attachPlot,
    layout,
    scenes,
    arcs,
    activeCharacterId,
    onActivate,
    onEscape,
    onSetPoint,
    onRemovePoint,
    characterActions,
}: BoardArcsEditing & {
    plotRef: RefObject<HTMLDivElement | null>,
    attachPlot: (element: HTMLDivElement | null) => void,
    layout: ArcsLayout,
    scenes: readonly BoardArcsScene[],
    arcs: readonly BoardArcsArc[],
    activeCharacterId: string | null,
    onActivate: (id: string) => void,
    onEscape: () => void,
}) => {
    const {
        tooltip,
        showPointTooltip,
        showArcTooltip,
        clearTooltip,
    } = useArcsTooltip(plotRef);
    const [openPoint, setOpenPoint] = useState<{characterId: string, sceneIndex: number} | null>(null);

    const activeArc = arcs.find(arc => arc.id === activeCharacterId);
    const isEditable = onSetPoint !== undefined;
    const headingBlockIds = scenes.map(scene => scene.headingBlockId);

    /* A removed point must not reopen its popover when one is added again. */
    const removePoint = onRemovePoint ? (headingBlockId: string, characterId: string) => {
        setOpenPoint(null);
        onRemovePoint(headingBlockId, characterId);
    } : undefined;

    const {stopProps, focusStop} = useArcsStops({
        plotRef,
        sceneCount: scenes.length,
        arc: isEditable ? activeArc : undefined,
        headingBlockIds,
        onSetPoint,
        onRemovePoint: removePoint,
        onOpenPoint: (characterId, sceneIndex) => setOpenPoint({characterId, sceneIndex}),
    });

    const pointer = useArcsPointer({
        plotRef,
        layout,
        activeCharacterId,
        arcs,
        sceneCount: scenes.length,
        onActivate,
        onSetPoint,
        onOpenPoint: (characterId, sceneIndex) => setOpenPoint({characterId, sceneIndex}),
        onFocusScene: focusStop,
    });

    /* Escape leaves the active character wherever the focus is, unless it already closed a popover or dropped a drag. */
    const isCharacterActive = activeCharacterId !== null;
    const isPopoverOpen = openPoint !== null;

    useEffect(() => {
        if (!isCharacterActive || isPopoverOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !event.defaultPrevented) onEscape();
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [
        isCharacterActive,
        isPopoverOpen,
        onEscape,
    ]);

    /* The point under the pointer follows it while it is dragged. */
    const pointsOf = (arc: BoardArcsArc): readonly BoardArcsPoint[] => {
        const {drag} = pointer;

        if (!drag || drag.characterId !== arc.id) return arc.points;

        const remaining = arc.points.filter(point => point.sceneIndex !== drag.sceneIndex);

        return [
            ...remaining,
            {
                headingBlockId: drag.headingBlockId,
                sceneIndex: drag.sceneIndex,
                evidence: arc.points.find(point => point.sceneIndex === drag.sceneIndex)?.evidence ?? arc.presence?.includes(drag.sceneIndex) ?? false,
                note: null,
                ...arc.points.find(point => point.sceneIndex === drag.sceneIndex),
                value: layout.valueAt(drag.y),
                hasStoredValue: true,
            },
        ].toSorted((left, right) => left.sceneIndex - right.sceneIndex);
    };

    const curveOf = (arc: BoardArcsArc) => arcCurvePoints(pointsOf(arc), scenes.length, layout);
    const arcPath = (arc: BoardArcsArc): string => buildMonotonePath(curveOf(arc));

    const ghostArc = arcs.find(arc => arc.id === pointer.ghost?.characterId);

    const closePopover = () => {
        const closed = openPoint;

        setOpenPoint(null);

        if (closed) requestAnimationFrame(() => focusStop(closed.sceneIndex));
    };

    return (
        <div ref={attachPlot} className={styles.plot}>
            {layout.width > 0 ? (
                <svg width={layout.width} height={layout.height} className={styles.svg}>
                    {isEditable ? scenes.map((scene, index) => {
                        const stopPoint = activeArc ? pointsOf(activeArc).find(item => item.sceneIndex === index) : undefined;

                        return (
                            <g key={scene.headingBlockId}>
                                <rect
                                    x={index * layout.columnWidth}
                                    y={0}
                                    width={layout.columnWidth}
                                    height={layout.height}
                                    className={styles.column}
                                    role="button"
                                    aria-label={activeArc ? pointLabel(activeArc, scene, stopPoint?.value ?? null) : `Add arc point in ${scene.title}`}
                                    {...(activeArc ? stopProps(index) : {tabIndex: -1})}
                                    {...pointer.columnProps(index, scene.headingBlockId)}
                                />
                                <ArcMarker
                                    x={layout.sceneX(index)}
                                    y={stopPoint ? layout.valueY(stopPoint.value) : layout.baselineY}
                                    radius={STOP_RING_RADIUS}
                                    evidence={stopPoint?.evidence ?? true}
                                    className={styles.stopRing}
                                    aria-hidden="true"
                                />
                            </g>
                        );
                    }) : null}
                    <line x1={0} y1={layout.baselineY} x2={layout.width} y2={layout.baselineY} className={styles.baseline} />
                    {arcs.map(arc => (
                        <g key={arc.id}>
                            {scenes.length > 1 ? (
                                <path
                                    d={arcPath(arc)}
                                    fill="none"
                                    stroke={arc.color}
                                    strokeWidth={STROKE_WIDTH}
                                    opacity={1}
                                    pointerEvents={isEditable ? 'none' : undefined}
                                    data-arc-path={arc.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Edit arc for ${arc.name}`}
                                    aria-pressed={arc.id === activeCharacterId}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onActivate(arc.id);
                                        }
                                    }}
                                    onClick={() => onActivate(arc.id)}
                                    onMouseEnter={event => {
                                        showArcTooltip(event, arc);
                                    }}
                                    onMouseLeave={() => {
                                        clearTooltip();
                                    }}
                                />
                            ) : null}
                            <ArcsPresence arc={arc} points={pointsOf(arc)} layout={layout} curve={curveOf(arc)} opacity={1} />
                            {isEditable ? (
                                <ArcsAnchors arc={arc} scenes={scenes} layout={layout} pointProps={pointer.pointProps} />
                            ) : null}
                            {pointsOf(arc).map(point => {
                                const scene = scenes[point.sceneIndex];

                                if (!scene) return null;

                                const isEditing = isEditable;

                                return (
                                    <ArcMarker
                                        key={point.headingBlockId}
                                        x={layout.sceneX(point.sceneIndex)}
                                        y={layout.valueY(point.value)}
                                        radius={POINT_RADIUS}
                                        evidence={point.evidence}
                                        fill={point.evidence ? arc.color : 'transparent'}
                                        stroke={arc.color}
                                        strokeWidth={point.evidence ? 0 : STROKE_WIDTH}
                                        opacity={1}
                                        role="img"
                                        aria-label={pointLabel(arc, scene, point.value)}
                                        data-point={`${arc.id}:${point.sceneIndex}`}
                                        data-evidence={point.evidence}
                                        className={isEditing ? styles.editablePoint : undefined}
                                        onClick={() => {
                                            onActivate(arc.id);

                                            /* The stops mount with the activation; the keyboard then continues from this scene. */
                                            requestAnimationFrame(() => focusStop(point.sceneIndex));
                                        }}
                                        onMouseEnter={event => {
                                            showPointTooltip(event, arc, scene, point);
                                        }}
                                        onMouseLeave={() => {
                                            clearTooltip();
                                        }}
                                        {...(isEditing ? pointer.pointProps(arc.id, point.headingBlockId, point.sceneIndex) : {})}
                                    />
                                );
                            })}
                        </g>
                    ))}
                    {isEditable && pointer.ghost && ghostArc ? (
                        <ArcsGhost arc={ghostArc} x={layout.sceneX(pointer.ghost.sceneIndex)} y={pointer.ghost.y} />
                    ) : null}
                </svg>
            ) : null}
            {tooltip ? (
                <div
                    className={styles.tooltip}
                    style={{
                        left: tooltip.left,
                        right: tooltip.right,
                        top: tooltip.top,
                    }}
                    role="tooltip"
                >
                    {tooltip.content}
                </div>
            ) : null}
            {isEditable && openPoint && characterActions && removePoint ? (
                <ArcsPointPopover
                    target={openPoint}
                    arcs={arcs}
                    scenes={scenes}
                    layout={layout}
                    characterActions={characterActions}
                    onRemovePoint={removePoint}
                    onClose={closePopover}
                />
            ) : null}
        </div>
    );
};
