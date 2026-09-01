import type {ReactNode} from 'react';

import {
    Switch,
    type SwitchProps,
} from '../../atoms/Switch';
import styles from './SettingSwitch.module.css';

type SettingSwitchProps = Omit<SwitchProps, 'className' | 'variant'> & {
    addon?: ReactNode,
};

export const SettingSwitch = ({
    addon,
    ...props
}: SettingSwitchProps) => (
    <div className={styles.root}>
        <Switch {...props} className={styles.control} />
        {addon ? <span className={styles.addon}>{addon}</span> : null}
    </div>
);
