import clsx from 'clsx';
import {ToggleButton} from 'react-aria-components';

import type {ScriptView} from './types';
import styles from './ViewSwitcher.module.css';

export type ViewSwitcherItem = {
    view: ScriptView,
    label: string,
};

export const VIEW_SWITCHER_ITEMS: readonly ViewSwitcherItem[] = [{view: 'editor', label: 'Editor'}, {view: 'export', label: 'Export'}];

type ViewSwitcherProps = {
    activeView: ScriptView,
    onSelectView: (view: ScriptView) => void,
};

export const ViewSwitcher = ({activeView, onSelectView}: ViewSwitcherProps) => {
    return (
        <div
            className={styles.switcher}
            role="group"
            aria-label="Views"
        >
            {VIEW_SWITCHER_ITEMS.map(item => (
                <ToggleButton
                    key={item.view}
                    className={clsx(styles.segment)}
                    isSelected={item.view === activeView}
                    aria-current={item.view === activeView ? 'page' : undefined}
                    onPress={() => {
                        if (item.view !== activeView) {
                            onSelectView(item.view);
                        }
                    }}
                >
                    {item.label}
                </ToggleButton>
            ))}
        </div>
    );
};
