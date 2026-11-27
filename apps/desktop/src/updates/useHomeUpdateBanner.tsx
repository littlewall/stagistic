import {NoticeBar} from '@stagistic/ui';
import {type ReactNode, useState} from 'react';
import {useLocation} from 'react-router-dom';

import {useDesktopUpdates} from '../lifecycle/updatesContext';

/*
 * On the script list, a downloaded update also gets a bar below the header:
 * the footer action alone is easy to miss. Hide keeps it away until the next launch.
 */
export const useHomeUpdateBanner = (): ReactNode => {
    const {pathname} = useLocation();
    const updates = useDesktopUpdates();
    const [isHidden, setIsHidden] = useState(false);

    if (pathname !== '/' || updates.state.status !== 'ready' || isHidden) {
        return null;
    }

    return (
        <NoticeBar
            message="A new version of Stagistic Editor is ready."
            actionLabel="Click to restart"
            width="page"
            onAction={updates.restart}
            onHide={() => setIsHidden(true)}
        />
    );
};
