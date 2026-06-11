import {
    Children,
    isValidElement,
    type ReactNode,
} from 'react';

const LEFT_SIDEBAR_SLOT = Symbol('EditorLeftSidebar');
const RIGHT_SIDEBAR_SLOT = Symbol('EditorRightSidebar');

type SlotType = {_slotId: symbol};

const makeSlot = (slotId: symbol) => {
    const SlotComponent = ({children}: {children?: ReactNode}) => {
        void children;

        return null;
    };

    (SlotComponent as unknown as SlotType)._slotId = slotId;

    return SlotComponent;
};

export const extractSidebarSlots = (children: ReactNode) => {
    let left: ReactNode = undefined;
    let right: ReactNode = undefined;

    Children.forEach(children, child => {
        if (!isValidElement(child)) {
            return;
        }

        const slotId = (child.type as unknown as Partial<SlotType>)._slotId;

        if (slotId === LEFT_SIDEBAR_SLOT) {
            left = (child.props as {children?: ReactNode}).children;

            return;
        }

        if (slotId === RIGHT_SIDEBAR_SLOT) {
            right = (child.props as {children?: ReactNode}).children;
        }
    });

    return {left, right};
};

/**
 * Compound-component slots. Render sidebars as children of FountainEditor so they
 * execute inside EditorSnapshotStoreProvider + EditorInstanceProvider and can call
 * useEditorLiveStructure(), useEditorLiveCharacters(), useEditorInstance(), etc.
 *
 * Usage:
 * ```tsx
 * <FountainEditor ...>
 *   <FountainEditor.LeftSidebar><MyStructureSidebar /></FountainEditor.LeftSidebar>
 *   <FountainEditor.RightSidebar><MyCharactersSidebar /></FountainEditor.RightSidebar>
 * </FountainEditor>
 * ```
 */
export const LeftSidebar = makeSlot(LEFT_SIDEBAR_SLOT);
export const RightSidebar = makeSlot(RIGHT_SIDEBAR_SLOT);
