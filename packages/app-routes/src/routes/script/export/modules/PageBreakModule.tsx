import type {PageBreakValue} from '@stagistic/export';
import {Switch} from '@stagistic/ui';

import styles from './modules.module.css';

export const PageBreakModule = ({
    value,
    onChange,
}: {
    value: PageBreakValue,
    onChange: (value: PageBreakValue) => void,
}) => (
    <div className={styles.module}>
        <div>
            <h3 className={styles.title}>Page breaks</h3>
            <p className={styles.description}>Control where acts and scenes begin.</p>
        </div>
        <Switch
            isSelected={value.actOnNewPage}
            onChange={actOnNewPage => onChange({...value, actOnNewPage})}
        >
            Acts start on a new page
        </Switch>
        <Switch
            isSelected={value.sceneOnNewPage || value.sceneOnOddPage}
            isDisabled={value.sceneOnOddPage}
            onChange={sceneOnNewPage => onChange({...value, sceneOnNewPage})}
        >
            Scenes start on a new page
        </Switch>
        <Switch
            isSelected={value.sceneOnOddPage}
            onChange={sceneOnOddPage => onChange({
                ...value,
                sceneOnOddPage,
                sceneOnNewPage: sceneOnOddPage ? true : value.sceneOnNewPage,
            })}
        >
            Scenes start on odd pages
        </Switch>
    </div>
);
