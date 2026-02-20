import styles from '../../ScriptEditorRoute.module.css';
import {ElementFormattingToolbar} from './ElementFormattingToolbar';
import {ElementNumericControls} from './ElementNumericControls';
import {ElementPreview} from './ElementPreview';
import type {ElementSettingsPanelProps} from './types';
import {useElementSettingsViewModel} from './useElementSettingsViewModel';

export const ElementSettingsPanel = ({
    blockType,
    blockLabel,
    resolvedScriptSettings,
    shortcutPrefix,
    onUpdateBlockSettings,
}: ElementSettingsPanelProps) => {
    const viewModel = useElementSettingsViewModel({
        blockType,
        resolvedScriptSettings,
    });

    return (
        <div className={styles.panelStack}>
            <h3 className={styles.panelTitle}>{blockLabel}</h3>
            <ElementPreview
                model={viewModel.preview}
                actions={{
                    onStartChange: nextStart => {
                        onUpdateBlockSettings(blockType, {
                            indentLeftChars: nextStart,
                        });
                    },
                    onEndChange: nextEnd => {
                        onUpdateBlockSettings(blockType, {
                            indentRightChars: viewModel.preview.previewReferenceChars - nextEnd,
                        });
                    },
                }}
                toolbar={(
                    <ElementFormattingToolbar
                        blockType={blockType}
                        model={viewModel.formatting}
                        actions={{onUpdateBlockSettings}}
                    />
                )}
            />
            <ElementNumericControls
                blockType={blockType}
                shortcutPrefix={shortcutPrefix}
                model={viewModel.numeric}
                actions={{onUpdateBlockSettings}}
            />
        </div>
    );
};
