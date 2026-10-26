import {listen} from '@tauri-apps/api/event';
import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

import {parseDeepLink} from './deepLink';

export const DEEP_LINK_EVENT = 'deep-link-open';

export const useDeepLinkNavigation = (): void => {
    const navigate = useNavigate();

    useEffect(() => {
        const unlisten = listen<string>(DEEP_LINK_EVENT, event => {
            const parsed = parseDeepLink(event.payload);

            if (!parsed) {
                return;
            }

            const queryParams = new URLSearchParams();

            if (parsed.blockId) {
                queryParams.set('block', parsed.blockId);
            }

            if (parsed.sceneId) {
                queryParams.set('scene', parsed.sceneId);
            }

            const queryStr = queryParams.toString();
            const target = `/script/${encodeURIComponent(parsed.scriptId)}/editor${queryStr ? `?${queryStr}` : ''}`;

            void navigate(target);
        });

        return () => {
            void unlisten.then(dispose => dispose());
        };
    }, [navigate]);
};
