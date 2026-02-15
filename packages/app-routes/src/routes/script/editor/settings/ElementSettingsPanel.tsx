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
                toolbar={(
                    <ElementFormattingToolbar
                        blockType={blockType}
                        textAlign={viewModel.textAlign}
                        casing={viewModel.casing}
                        isBold={viewModel.isBold}
                        isItalic={viewModel.isItalic}
                        isUnderline={viewModel.isUnderline}
                        onUpdateBlockSettings={onUpdateBlockSettings}
                    />
                )}
                previewStyle={viewModel.previewStyle}
                previewText={viewModel.previewText}
                sliderStart={viewModel.sliderStart}
                sliderEnd={viewModel.sliderEnd}
                previewReferenceChars={viewModel.previewReferenceChars}
                minPreviewContentChars={viewModel.minPreviewContentChars}
                leftTotalInches={viewModel.leftTotalInches}
                rightTotalInches={viewModel.rightTotalInches}
                contentChars={viewModel.contentChars}
                onStartChange={nextStart => {
                    onUpdateBlockSettings(blockType, {
                        indentLeftChars: nextStart,
                    });
                }}
                onEndChange={nextEnd => {
                    onUpdateBlockSettings(blockType, {
                        indentRightChars: viewModel.previewReferenceChars - nextEnd,
                    });
                }}
            />
            <ElementNumericControls
                blockType={blockType}
                shortcutPrefix={shortcutPrefix}
                spacingBefore={viewModel.spacingBefore}
                lineHeight={viewModel.lineHeight}
                shortcut={viewModel.shortcut}
                nextElement={viewModel.nextElement}
                spacingBeforeOptions={viewModel.spacingBeforeOptions}
                lineHeightOptions={viewModel.lineHeightOptions}
                shortcutOptions={viewModel.shortcutOptions}
                nextElementOptions={viewModel.nextElementOptions}
                onUpdateBlockSettings={onUpdateBlockSettings}
            />
        </div>
    );
};
