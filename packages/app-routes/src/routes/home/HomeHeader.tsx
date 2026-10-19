import {AppHeader} from '../../layout/AppHeader';
import styles from './HomeHeader.module.css';

export const HomeHeader = () => (
    <AppHeader
        showScriptActions={false}
        scriptControls={(
            <div className={styles.brand}>
                <svg
                    className={styles.mark}
                    viewBox="9.95484 8.87608 94.88736 94.88736"
                    fill="currentColor"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path d="M91.2 25.89c-.33.43-.75.66-1.28.7-17.63-.94-50.08 6.13-53.45 27.23-1.7 20.58 40.27 15.93 46.44 28.8 1.77 9.11-9.82 16.85-17.75 17.93-10.41 1.93-20.73 1.52-30.96-1.23-7.48-2.01-13.88-7.19-17.7-14.33-26.74-49.95 34.5-99.85 74.7-59.1Z" />
                    <path d="M100.18 39.13c5.3 11.78 6.47 25.95 1.48 38.04-10.99-16.22-38.53-12.39-46.48-22.88-4.79-18.79 39.57-21.51 45-15.16Z" />
                </svg>
                <span>Stagistic Editor</span>
            </div>
        )}
    />
);
