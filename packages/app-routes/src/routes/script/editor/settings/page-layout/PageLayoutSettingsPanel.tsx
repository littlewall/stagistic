import {clsx} from '@stagistic/ui';

import {MIN_PAGE_MARGIN_HORIZONTAL_PX} from '../constants';
import {clamp} from '../math';
import {SettingsSelect} from '../SettingsSelect';
import sharedStyles from '../shared.module.css';
import type {ScriptEditorSettingsPanelProps} from '../types';
import styles from './PageLayoutSettingsPanel.module.css';
import {usePageLayoutSettingsViewModel} from './usePageLayoutSettingsViewModel';

const MIN_PAGE_CONTENT_WIDTH_PX = 320;

interface PageLayoutSettingsPanelProps {
    resolvedScriptSettings: ScriptEditorSettingsPanelProps['resolvedScriptSettings'],
    onUpdatePageSettings: ScriptEditorSettingsPanelProps['onUpdatePageSettings'],
}

export const PageLayoutSettingsPanel = ({
    resolvedScriptSettings,
    onUpdatePageSettings,
}: PageLayoutSettingsPanelProps) => {
    const {preview, slider, numeric} = usePageLayoutSettingsViewModel({resolvedScriptSettings});
    const {pagePreviewStyle, headerRows, footerRows, contentRows} = preview;
    const {
        sliderStyle,
        sliderStart,
        sliderEnd,
        previewReferenceTotal,
        minSliderStart,
        maxSliderEnd,
        leftMarginInches,
        rightMarginInches,
        contentWidthInches,
    } = slider;
    const {topMarginRows, bottomMarginRows, marginRowOptions} = numeric;

    const fontSizePx = resolvedScriptSettings.typography.fontSizePx;

    const marginSliderStep = 0.05 * 96; // 0.05"

    return (
        <div className={sharedStyles.previewCard}>
            <div className={sharedStyles.settingsFlatGrid}>
                <div className={sharedStyles.settingsField}>
                    <span className={sharedStyles.fieldLabel}>Top margin</span>
                    <SettingsSelect
                        id="settings-margin-top"
                        ariaLabel="Select top margin rows"
                        value={topMarginRows}
                        options={marginRowOptions}
                        onChange={nextValue => {
                            onUpdatePageSettings({marginTopPx: Number(nextValue) * fontSizePx});
                        }}
                    />
                </div>
                <div className={sharedStyles.settingsField}>
                    <span className={sharedStyles.fieldLabel}>Bottom margin</span>
                    <SettingsSelect
                        id="settings-margin-bottom"
                        ariaLabel="Select bottom margin rows"
                        value={bottomMarginRows}
                        options={marginRowOptions}
                        onChange={nextValue => {
                            onUpdatePageSettings({marginBottomPx: Number(nextValue) * fontSizePx});
                        }}
                    />
                </div>
            </div>
            <div className={styles.pageSchematic} style={pagePreviewStyle}>
                <div className={styles.pageSchematicMarginTop} />
                <div className={styles.pageSchematicMiddle}>
                    <div className={styles.pageSchematicMarginLeft} />
                    <div className={styles.pageSchematicCenter}>
                        <div className={styles.pageSchematicZone}>
                            {`Header: ${headerRows} row${headerRows === 1 ? '' : 's'}`}
                        </div>
                        <div className={styles.pageSchematicContent}>
                            {`~${contentRows} rows`}
                        </div>
                        <div className={styles.pageSchematicZone}>
                            {`Footer: ${footerRows} row${footerRows === 1 ? '' : 's'}`}
                        </div>
                    </div>
                    <div className={styles.pageSchematicMarginRight} />
                </div>
                <div className={styles.pageSchematicMarginBottom} />
            </div>
            <div className={sharedStyles.indentSliderTrack} style={sliderStyle}>
                <span className={sharedStyles.indentSliderBase} />
                <span className={sharedStyles.indentSliderMiddleBase} />
                <span className={sharedStyles.indentSliderSelected} />
                <span className={sharedStyles.indentSliderDefaultStart} />
                <span className={sharedStyles.indentSliderDefaultEnd} />
                <input
                    type="range"
                    className={clsx(sharedStyles.indentSliderInput, sharedStyles.indentSliderInputStart)}
                    min={0}
                    max={previewReferenceTotal}
                    step={marginSliderStep}
                    value={sliderStart}
                    onChange={event => {
                        const rawStart = Number.parseFloat(event.target.value);
                        const maxStart = clamp(
                            sliderEnd - MIN_PAGE_CONTENT_WIDTH_PX,
                            minSliderStart,
                            previewReferenceTotal,
                        );
                        const nextLeft = clamp(rawStart, minSliderStart, maxStart);
                        const nextRightPx = previewReferenceTotal - sliderEnd;

                        onUpdatePageSettings({marginLeftPx: nextLeft, marginRightPx: nextRightPx});
                    }}
                    aria-label="Left page margin"
                />
                <input
                    type="range"
                    className={clsx(sharedStyles.indentSliderInput, sharedStyles.indentSliderInputEnd)}
                    min={0}
                    max={previewReferenceTotal}
                    step={marginSliderStep}
                    value={sliderEnd}
                    onChange={event => {
                        const rawEnd = Number.parseFloat(event.target.value);
                        const minEnd = clamp(
                            sliderStart + MIN_PAGE_CONTENT_WIDTH_PX,
                            0,
                            maxSliderEnd,
                        );
                        const nextEnd = clamp(rawEnd, minEnd, maxSliderEnd);
                        const nextRightPx = previewReferenceTotal - nextEnd;

                        onUpdatePageSettings({
                            marginLeftPx: sliderStart,
                            marginRightPx: clamp(nextRightPx, MIN_PAGE_MARGIN_HORIZONTAL_PX, previewReferenceTotal),
                        });
                    }}
                    aria-label="Right page margin"
                />
            </div>
            <div className={sharedStyles.indentSliderLabels}>
                <span>{'Left: '}{leftMarginInches}</span>
                <span>{contentWidthInches}{' wide'}</span>
                <span>{'Right: '}{rightMarginInches}</span>
            </div>
        </div>
    );
};
