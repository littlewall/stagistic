import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import styles from './ScriptStructureSidebar.module.css';
import type {StructureSidebarHeaderProps} from './types';

const joinClassNames = (...classNames: Array<string | false | null | undefined>) => {
    return classNames.filter(Boolean).join(' ');
};

export const StructureSidebarHeader = ({
    actions,
}: StructureSidebarHeaderProps) => {
    const [openHeaderMenu, setOpenHeaderMenu] = useState<'actions' | 'insert' | null>(null);
    const actionsTriggerRef = useRef<HTMLButtonElement | null>(null);
    const insertTriggerRef = useRef<HTMLButtonElement | null>(null);
    const actionsMenuRef = useRef<HTMLDivElement | null>(null);
    const insertMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!openHeaderMenu) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;

            if (actionsTriggerRef.current?.contains(target) || insertTriggerRef.current?.contains(target)) {
                return;
            }

            if (actionsMenuRef.current?.contains(target) || insertMenuRef.current?.contains(target)) {
                return;
            }

            setOpenHeaderMenu(null);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenHeaderMenu(null);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [openHeaderMenu]);

    const handleToggleHeaderMenu = useCallback((menu: 'actions' | 'insert') => {
        setOpenHeaderMenu(previous => {
            return previous === menu ? null : menu;
        });
    }, []);

    const handleInsertAct = useCallback(() => {
        actions.onInsertAct();
        setOpenHeaderMenu(null);
    }, [actions]);

    return (
        <div className={styles.sidebarHeader}>
            <button
                type="button"
                className={styles.headerIconButton}
                aria-label="Structure actions"
                aria-expanded={openHeaderMenu === 'actions'}
                onMouseDown={event => {
                    event.preventDefault();
                    handleToggleHeaderMenu('actions');
                }}
                ref={actionsTriggerRef}
            >
                •••
            </button>
            {openHeaderMenu === 'actions' ? (
                <div
                    className={styles.headerMenu}
                    ref={actionsMenuRef}
                    role="menu"
                >
                    <p className={styles.empty}>No actions yet</p>
                </div>
            ) : null}
            <button
                type="button"
                className={styles.headerIconButton}
                aria-label="Insert markers"
                aria-expanded={openHeaderMenu === 'insert'}
                onMouseDown={event => {
                    event.preventDefault();
                    handleToggleHeaderMenu('insert');
                }}
                ref={insertTriggerRef}
            >
                +
            </button>
            {openHeaderMenu === 'insert' ? (
                <div
                    className={joinClassNames(styles.headerMenu, styles.headerMenuRight)}
                    ref={insertMenuRef}
                    role="menu"
                >
                    <button
                        type="button"
                        className={styles.headerMenuItem}
                        onMouseDown={event => {
                            event.preventDefault();
                            handleInsertAct();
                        }}
                    >
                        Insert ACT
                    </button>
                </div>
            ) : null}
        </div>
    );
};
