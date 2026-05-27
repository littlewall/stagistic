/**
 * dnd-kit customization for the structure sidebar.
 *
 * The defaults already include the Accessibility plugin (screen-reader live region
 * + ARIA instructions) and the PointerSensor + KeyboardSensor. Here we replace those
 * with configured versions that:
 *   - announce scene titles when picked up / dropped (instead of generic "item N");
 *   - require 5 px of pointer movement before activating drag (avoids accidental
 *     drags when the user just clicks the handle).
 *
 * KeyboardSensor is left at defaults: Space/Enter to pick up, arrow keys to move,
 * Escape to cancel.
 */
import type {PluginDescriptor, SensorDescriptor} from '@dnd-kit/abstract';
import {
    Accessibility,
    type DragEndEvent,
    type DragStartEvent,
    PointerActivationConstraints,
    PointerSensor,
} from '@dnd-kit/dom';

import type {SceneItem} from './structureRows';

/*
 * `DragStartEvent`/`DragEndEvent` from @dnd-kit are the handler signatures
 * (functions), not the event payloads. Extract the first parameter to get
 * the actual event object that announcements receive.
 */
type DragStartEventArg = Parameters<DragStartEvent>[0];
type DragEndEventArg = Parameters<DragEndEvent>[0];

const SCREEN_READER_INSTRUCTIONS = {
    draggable:
        'To pick up a scene, focus its drag handle and press Space or Enter. ' +
        'Use the arrow keys to move it between positions. ' +
        'Press Space or Enter again to drop, or Escape to cancel.',
};

/**
 * Build an Accessibility plugin descriptor with announcements that know the
 * current scene titles. Re-create whenever `sceneByBlockId` identity changes.
 */
export const buildAccessibilityPlugin = (
    sceneByBlockId: ReadonlyMap<string, SceneItem>,
): PluginDescriptor => {
    return Accessibility.configure({
        screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
        announcements: {
            dragstart: (event: DragStartEventArg) => {
                const id = event.operation.source?.id;
                const scene = id != null ? sceneByBlockId.get(String(id)) : null;

                return scene
                    ? `Picked up scene "${scene.title}".`
                    : 'Picked up scene.';
            },
            dragend: (event: DragEndEventArg) => {
                const id = event.operation.source?.id;
                const scene = id != null ? sceneByBlockId.get(String(id)) : null;
                const title = scene?.title ?? 'scene';

                if (event.canceled) {
                    return `Cancelled moving "${title}".`;
                }

                return `Dropped "${title}".`;
            },
        },
    });
};

/**
 * Pointer sensor that needs 5 px of movement before activation. The drag handle
 * is a small target — without this, a single click on it would already register
 * as a (zero-length) drag, which then gets rejected by our onDragEnd no-op
 * check but still fires the drop animation. The distance threshold makes
 * "click to focus" cleanly distinct from "click + drag to reorder".
 */
export const configuredPointerSensor: SensorDescriptor = PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({value: 5})],
});
