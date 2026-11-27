import {LoaderOverlay} from '@stagistic/ui';

/** Shown while a `.stepkg` package is built, before its Save dialog opens. */
export const PreparingPackageOverlay = () => (
    <LoaderOverlay variant="scrim" label="Preparing package" messages={['Preparing the script for export…']} />
);
