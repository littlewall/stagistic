import {useScripts} from '@stagistic/app-core';
import type {ComponentProps} from 'react';

import {ReleaseNotesProvider} from './ReleaseNotesProvider';

/**
 * `ReleaseNotesProvider` that knows from the script list whether the writer has scripts, which
 * decides whether a new Release is announced. Needs the script repository.
 */
export const ScriptReleaseNotesProvider = (props: Omit<ComponentProps<typeof ReleaseNotesProvider>, 'hasScripts'>) => {
    const {
        scriptSummaries,
        isLoading,
        error,
    } = useScripts();
    const isKnown = !isLoading && !error;

    return <ReleaseNotesProvider {...props} hasScripts={isKnown ? scriptSummaries.length > 0 : undefined} />;
};
