import type {PluginDescriptor, SensorDescriptor} from '@dnd-kit/abstract';
import {
    Accessibility,
    type DragEndEvent,
    type DragStartEvent,
    Feedback,
    KeyboardSensor,
    PointerActivationConstraints,
    PointerSensor,
} from '@dnd-kit/dom';

import type {SceneItem} from './structureRows';

type DragStartEventArg = Parameters<DragStartEvent>[0];
type DragEndEventArg = Parameters<DragEndEvent>[0];

const SCREEN_READER_INSTRUCTIONS = {
    draggable:
        'To pick up a scene, focus its drag handle and press Space or Enter. ' +
        'Use the arrow keys to move it between positions. ' +
        'Press Space or Enter again to drop, or Escape to cancel.',
};

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

export const configuredPointerSensor: SensorDescriptor = PointerSensor.configure({
    activationConstraints: [new PointerActivationConstraints.Distance({value: 5})],
});

export const configuredKeyboardSensor: SensorDescriptor = KeyboardSensor.configure({});

export const feedbackWithoutDropAnimation: PluginDescriptor = Feedback.configure({
    dropAnimation: null,
});
