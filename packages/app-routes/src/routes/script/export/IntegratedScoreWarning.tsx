import {type BasicExportConfig, deriveIntegratedScoreExportPlan} from '@stagistic/export';
import {Notice} from '@stagistic/ui';
import {useState} from 'react';

import {useScriptSettingsModal} from '../settings/ScriptSettingsModalProvider';
import {useExportContext} from './ExportProvider';
import styles from './IntegratedScoreWarning.module.css';

export const IntegratedScoreWarning = ({config}: {config: BasicExportConfig}) => {
    const {script, musicAttachments} = useExportContext();
    const {openAttributeManagerMusic} = useScriptSettingsModal();
    const [isOpen, setIsOpen] = useState(false);
    const missing = deriveIntegratedScoreExportPlan(config, script).postSteps.filter(step => !musicAttachments?.integratedScoresByMusic.get(step.musicId));

    if (missing.length === 0) {
        return null;
    }

    return (
        <Notice variant="warning" className={styles.warningExtras}>
            <span>{`${missing.length} music ${missing.length === 1 ? 'number is' : 'numbers are'} missing an Integrated score PDF`}</span>
            <button type="button" onClick={() => setIsOpen(value => !value)}>
                Review missing music
            </button>
            {isOpen ? (
                <ul>
                    {missing.map(step => (
                        <li key={step.musicId}>
                            <button type="button" onClick={() => openAttributeManagerMusic(step.musicId)}>
                                {step.title || 'Untitled music'}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </Notice>
    );
};
