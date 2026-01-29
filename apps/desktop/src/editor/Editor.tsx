import { placeholder as sharedPlaceholder } from '@stagistic/shared';
import { placeholder as syncPlaceholder } from '@stagistic/sync-core';
import { FountainNodeType } from '@stagistic/editor-core';

export const Editor = () => {
    const sampleNode = Object.keys(FountainNodeType)[0] ?? 'Unknown';

    return (
        <div>
            <h2>Editor Placeholder</h2>
            <p>This is a minimal desktop editor view.</p>
            <p>Shared package says: {sharedPlaceholder}</p>
            <p>Sync-core placeholder: {syncPlaceholder}</p>
            <p>Editor-core sample node: {sampleNode}</p>
        </div>
    );
};
