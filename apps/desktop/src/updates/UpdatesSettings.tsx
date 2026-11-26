import {MacUpdatesSettingsPanel, useWhatsNew} from '@stagistic/app-routes';
import {currentReleaseNumber} from '@stagistic/release-notes/bundled';

import {useDesktopUpdates} from '../lifecycle/updatesContext';
import {openExternalUrl} from '../links/externalLinks';

export const UpdatesSettings = () => {
    const updates = useDesktopUpdates();
    const whatsNew = useWhatsNew();

    return (
        <MacUpdatesSettingsPanel
            currentRelease={currentReleaseNumber}
            status={updates.state}
            onCheckNow={() => void updates.checkNow()}
            onRestart={updates.restart}
            onOpenWhatsNew={whatsNew.open}
            onOpenChangelog={url => void openExternalUrl(url).catch((error: unknown) => console.error('Could not open the changelog', error))}
        />
    );
};
