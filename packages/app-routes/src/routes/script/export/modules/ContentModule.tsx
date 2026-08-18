import {Switch} from '@stagistic/ui';

import styles from './modules.module.css';

export const ContentModule = ({
    value,
    onChange,
}: {
    value: boolean,
    onChange: (value: boolean) => void,
}) => (
    <div className={styles.module}>
        <div>
            <h3 className={styles.title}>Content</h3>
        </div>
        <Switch isSelected={value} onChange={onChange}>
            Show notes
        </Switch>
    </div>
);
