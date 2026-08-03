import {
    type ReactNode, useEffect, useState,
} from 'react';

import styles from './UnsupportedScreenGate.module.css';

export const MIN_SUPPORTED_WIDTH = 1000;

interface UnsupportedScreenGateProps {
    children: ReactNode,
}

const useViewportWidth = () => {
    const [width, setWidth] = useState(() => typeof window === 'undefined' ? MIN_SUPPORTED_WIDTH : window.innerWidth);

    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth);

        window.addEventListener('resize', onResize);

        return () => window.removeEventListener('resize', onResize);
    }, []);

    return width;
};

export const UnsupportedScreenGate = ({children}: UnsupportedScreenGateProps) => {
    const width = useViewportWidth();

    if (width >= MIN_SUPPORTED_WIDTH) {
        return children;
    }

    return (
        <div className={styles.screen} role="alert">
            <div className={styles.card}>
                <p className={styles.wordmark}>Stagistic Editor</p>
                <h1 className={styles.title}>Made for larger screens.</h1>
                <p className={styles.body}>
                    The editor isn&rsquo;t built for phones or small windows yet.
                    Open Stagistic Editor on a laptop or desktop browser at least
                    {' '}{MIN_SUPPORTED_WIDTH} pixels wide &mdash; mobile support is
                    on the way.
                </p>
            </div>
        </div>
    );
};
