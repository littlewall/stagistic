import {Button as RACButton} from 'react-aria-components';

import type {ArcsLayout} from './arcsGeometry';
import {pointLabel, sceneLabel} from './arcsLabels';
import type {BoardArcsArc, BoardArcsScene} from './arcsTypes';
import styles from './BoardArcs.module.css';
import type {BoardCharacterActions} from './BoardCharacterPopover';
import {BoardCharacterPopover} from './BoardCharacterPopover';

/*
 * The Wall's character popover on an arc point, anchored to an invisible button at the
 * point. Only mounted for an editable Board, so "Remove point" is never offered read-only.
 * A target whose point has gone renders nothing.
 */
export const ArcsPointPopover = ({
    target,
    arcs,
    scenes,
    layout,
    characterActions,
    onRemovePoint,
    onClose,
}: {
    target: {characterId: string, sceneIndex: number},
    arcs: readonly BoardArcsArc[],
    scenes: readonly BoardArcsScene[],
    layout: ArcsLayout,
    characterActions: (headingBlockId: string) => BoardCharacterActions,
    onRemovePoint: (headingBlockId: string, characterId: string) => void,
    onClose: () => void,
}) => {
    const arc = arcs.find(item => item.id === target.characterId);
    const point = arc?.points.find(item => item.sceneIndex === target.sceneIndex);
    const scene = scenes[target.sceneIndex];

    if (!arc || !point || !scene) return null;

    return (
        <BoardCharacterPopover
            chip={{
                id: arc.id,
                characterId: arc.id,
                name: arc.name,
                color: arc.color,
                source: point.evidence ? 'script' : 'card',
                note: point.note,
            }}
            actions={{
                ...characterActions(scene.headingBlockId),
                onRemove: undefined,
                onRemovePoint: point.hasStoredValue ? () => onRemovePoint(scene.headingBlockId, arc.id) : undefined,
            }}
            sceneLabel={sceneLabel(scene)}
            isOpen
            onOpenChange={open => {
                if (!open) onClose();
            }}
        >
            <RACButton
                className={styles.popoverAnchor}
                style={{left: layout.sceneX(point.sceneIndex), top: layout.valueY(point.value)}}
                aria-label={pointLabel(arc, scene, point.value)}
                excludeFromTabOrder
            />
        </BoardCharacterPopover>
    );
};
