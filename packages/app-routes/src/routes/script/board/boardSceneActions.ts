import type {SceneCardActions} from '@stagistic/ui';

import type {WallScene} from './buildWallView';

/* The scene menu only takes you there: acts and deletions have their own controls on the Wall and in the Editor. */
export const buildSceneActions = (
    scene: WallScene,
    openInEditor: (blockId: string) => void,
): SceneCardActions => ({
    label: `Scene ${scene.number} actions`,
    items: [{id: 'open-in-editor', label: 'Open in Editor'}],
    onAction: () => openInEditor(scene.headingBlockId),
});
