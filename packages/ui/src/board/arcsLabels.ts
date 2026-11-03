import {spokenArcValue} from './arcsGeometry';
import type {BoardArcsArc, BoardArcsScene} from './arcsTypes';

/* The one source of how a scene and an arc point read, for the tooltip, the popover and screen readers. */

/** "2. Kitchen", or just the title when numbering is none. */
export const sceneLabel = (scene: BoardArcsScene): string => (scene.number === '' ? scene.title : `${scene.number} ${scene.title}`);

/** The tooltip line: "Scene: 2. Kitchen". */
export const sceneLine = (scene: BoardArcsScene): string => `Scene: ${sceneLabel(scene)}`;

/** The scene as spoken: "Scene 2. Kitchen", or just the title when numbering is none. */
const spokenScene = (scene: BoardArcsScene): string => (scene.number === '' ? scene.title : `Scene ${sceneLabel(scene)}`);

/** The accessible name of a character in a scene: "ANNA, Scene 2. Kitchen, slightly worse" (`null`: no point yet). */
export const pointLabel = (arc: BoardArcsArc, scene: BoardArcsScene, value: number | null): string => `${arc.name}, ${spokenScene(scene)}, ${value === null ? 'no point' : spokenArcValue(value)}`;

