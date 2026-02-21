declare module '@tiptap/extension-drag-handle' {
    import {Extension} from '@tiptap/core';

    const DragHandle: Extension;

    export default DragHandle;
}

declare module '@tiptap/extension-unique-id' {
    import {Extension} from '@tiptap/core';

    const UniqueID: Extension;

    export default UniqueID;
}

declare module '@tiptap/extension-drag-handle-react' {
    import type {ComputePositionConfig} from '@floating-ui/dom';
    import type {Editor as TiptapEditor} from '@tiptap/react';
    import type {
        DragEvent,
        ReactElement,
        ReactNode,
    } from 'react';

    interface VirtualElementLike {
        getBoundingClientRect: () => DOMRect,
    }

    interface DragHandleProps {
        editor: TiptapEditor | null,
        children: ReactNode,
        className?: string,
        locked?: boolean,
        computePositionConfig?: ComputePositionConfig,
        onElementDragStart?: (event: DragEvent<HTMLDivElement>) => void,
        getReferencedVirtualElement?: () => Element | VirtualElementLike | null,
    }

    export const DragHandle: (props: DragHandleProps) => ReactElement | null;
}
