import {renderTurnstile} from '@stagistic/auth-client';
import {useEffect, useRef} from 'react';

/** Turnstile widget slot for the sign-in modal; reports the token (null when expired). */
export const TurnstileField = ({siteKey, onToken}: {siteKey: string, onToken: (token: string | null) => void}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const onTokenRef = useRef(onToken);

    onTokenRef.current = onToken;

    useEffect(() => {
        const container = containerRef.current;

        return container ? renderTurnstile(container, {siteKey, onToken: token => onTokenRef.current(token)}) : undefined;
    }, [siteKey]);

    return <div ref={containerRef} />;
};
