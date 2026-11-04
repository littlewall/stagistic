import {useDroppable} from '@dnd-kit/react';
import {useSortable} from '@dnd-kit/react/sortable';
import {
    BoardAddSceneCard,
    SceneCard,
    type SceneCardActions,
} from '@stagistic/ui';
import type {FocusEventHandler, ReactNode} from 'react';

import type {WallScene} from './buildWallView';

export const BOARD_SCENE_TYPE = 'board-scene';
export const BOARD_ACT_END_TYPE = 'board-act-end';

interface BoardSceneItemProps {
    scene: WallScene,
    group: string,
    index: number,
    isReadOnly: boolean,
    before?: ReactNode,
    titleContent?: ReactNode,
    actions: SceneCardActions,
    /** Outline and characters, under the name of a full card. */
    body?: ReactNode,
    onBlur?: FocusEventHandler<HTMLLIElement>,
}

const SortableBoardSceneItem = ({
    scene,
    group,
    index,
    before,
    titleContent,
    actions,
    body,
    onBlur,
}: BoardSceneItemProps) => {
    const {ref} = useSortable({
        id: scene.headingBlockId,
        index,
        group,
        type: BOARD_SCENE_TYPE,
        accept: [BOARD_SCENE_TYPE],
        feedback: 'clone',
    });

    return (
        <SceneCard
            ref={ref}
            sceneId={scene.headingBlockId}
            onBlur={onBlur}
            number={scene.number}
            title={scene.title}
            titleContent={titleContent}
            before={before}
            isDraggable
            page={scene.page}
            variant={scene.isCollapsed ? 'collapsed' : 'full'}
            actions={actions}
        >
            {body}
        </SceneCard>
    );
};

export const BoardSceneItem = (props: BoardSceneItemProps) => {
    if (!props.isReadOnly) return <SortableBoardSceneItem {...props} />;

    return (
        <SceneCard
            number={props.scene.number}
            title={props.scene.title}
            page={props.scene.page}
            variant={props.scene.isCollapsed ? 'collapsed' : 'full'}
            actions={props.actions}
        >
            {props.body}
        </SceneCard>
    );
};

/** The end of an act: the "Add scene" card, which also takes a dragged scene to the end (its id is the act key). */
export const BoardSceneEndTarget = ({
    group,
    label,
    onAdd,
    children,
}: {
    group: string,
    label: string,
    onAdd: () => void,
    /** Replaces the card, e.g. with the form naming a new last scene. */
    children?: ReactNode,
}) => {
    const {ref} = useDroppable({
        id: group,
        type: BOARD_ACT_END_TYPE,
        accept: [BOARD_SCENE_TYPE],
    });

    return (
        <BoardAddSceneCard ref={ref} label={label} onPress={onAdd}>
            {children}
        </BoardAddSceneCard>
    );
};
