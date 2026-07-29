import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {
    clsx,
    formControlStyles,
    FormSelect,
} from '@stagistic/ui';
import {
    startTransition,
    useEffect,
    useRef,
    useState,
} from 'react';

import {MIN_PAGE_MARGIN_HORIZONTAL_PX, PX_PER_INCH} from '../constants';
import {clamp, formatInches} from '../math';
import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import sharedStyles from '../shared.module.css';
import type {
    PageLayoutHandlers,
    ScriptEditorSettingsPanelProps,
} from '../types';
import styles from './PageLayoutSettingsPanel.module.css';
import {usePageLayoutSettingsViewModel} from './usePageLayoutSettingsViewModel';

const MIN_PAGE_CONTENT_WIDTH_PX = 320;

// 96 dpi: A4 = 8.27" × 11.69", US Letter = 8.5" × 11".
const PAGE_SIZE_PRESETS = [
    {
        id: 'a4',
        label: 'A4',
        widthPx: 794,
        heightPx: 1123,
    }, {
        id: 'letter',
        label: 'US Letter',
        widthPx: 816,
        heightPx: 1056,
    },
] as const;

const resolvePageSizePresetId = (widthPx: number, heightPx: number): string => {
    const preset = PAGE_SIZE_PRESETS.find(
        candidate => candidate.widthPx === widthPx && candidate.heightPx === heightPx,
    );

    return preset?.id ?? 'custom';
};

interface PageLayoutSettingsPanelProps {
    resolvedScriptSettings: ScriptEditorSettingsPanelProps['resolvedScriptSettings'],
    onUpdatePageSettings: PageLayoutHandlers['onUpdatePageSettings'],
}

export const PageLayoutSettingsPanel = ({
    resolvedScriptSettings,
    onUpdatePageSettings,
}: PageLayoutSettingsPanelProps) => {
    const {
        preview,
        slider,
        numeric,
    } = usePageLayoutSettingsViewModel({resolvedScriptSettings});
    const {
        pagePreviewStyle, headerRows, footerRows, contentRows,
    } = preview;
    const {
        sliderStyle,
        sliderStart,
        sliderEnd,
        previewReferenceTotal,
        minSliderStart,
        maxSliderEnd,
    } = slider;
    const {
        topMarginRows,
        bottomMarginRows,
        marginRowOptions,
    } = numeric;

    const fontSizePx = resolvedScriptSettings.typography.fontSizePx;

    const pageWidthPx = resolvedScriptSettings.page.widthPx ?? DEFAULT_EDITOR_SETTINGS.page.widthPx;
    const pageHeightPx = resolvedScriptSettings.page.heightPx ?? DEFAULT_EDITOR_SETTINGS.page.heightPx;
    const pageSizePresetId = resolvePageSizePresetId(pageWidthPx, pageHeightPx);
    const pageSizeOptions = [
        ...PAGE_SIZE_PRESETS.map(preset => ({
            value: preset.id,
            label: preset.label,
        })), ...pageSizePresetId === 'custom'
            ? [{value: 'custom', label: 'Custom'}]
            : [],
    ];

    const marginSliderStep = 0.05 * 96; // 0.05"

    const [localTopMarginRows, setLocalTopMarginRows] = useState(topMarginRows);
    const [localBottomMarginRows, setLocalBottomMarginRows] = useState(bottomMarginRows);

    useEffect(() => {
        setLocalTopMarginRows(topMarginRows);
    }, [topMarginRows]);
    useEffect(() => {
        setLocalBottomMarginRows(bottomMarginRows);
    }, [bottomMarginRows]);

    const [localSliderStart, setLocalSliderStart] = useState(sliderStart);
    const [localSliderEnd, setLocalSliderEnd] = useState(sliderEnd);
    const latestStart = useRef(sliderStart);
    const latestEnd = useRef(sliderEnd);

    useEffect(() => {
        setLocalSliderStart(sliderStart);
        latestStart.current = sliderStart;
    }, [sliderStart]);
    useEffect(() => {
        setLocalSliderEnd(sliderEnd);
        latestEnd.current = sliderEnd;
    }, [sliderEnd]);

    const safeTotal = Math.max(1, previewReferenceTotal);
    const localMarginRightPx = previewReferenceTotal - localSliderEnd;
    const localLeftMarginInches = formatInches(localSliderStart / PX_PER_INCH);
    const localRightMarginInches = formatInches(localMarginRightPx / PX_PER_INCH);
    const localContentWidthInches = formatInches(
        Math.max(0, previewReferenceTotal - localSliderStart - localMarginRightPx) / PX_PER_INCH,
    );
    const localSliderStyleOverride = {
        '--preview-indent-start-percent': `${(localSliderStart / safeTotal) * 100}%`,
        '--preview-indent-end-percent': `${(localSliderEnd / safeTotal) * 100}%`,
    } as React.CSSProperties;
    const localSchematicOverride = {
        '--page-margin-left-percent': `${clamp((localSliderStart / safeTotal) * 100, 0, 50)}%`,
        '--page-margin-right-percent': `${clamp((localMarginRightPx / safeTotal) * 100, 0, 50)}%`,
        '--page-margin-top-height': `${localTopMarginRows * 4}px`,
        '--page-margin-bottom-height': `${localBottomMarginRows * 4}px`,
    } as React.CSSProperties;

    return (
        <div className={panelStyles.panelStack}>
            <h3 className={panelStyles.panelTitle}>Page layout</h3>
            <div className={formControlStyles.previewCard}>
                <div className={styles.pageSettingsGrid}>
                    <div className={formControlStyles.field}>
                        <span className={formControlStyles.label}>Page size</span>
                        <FormSelect
                            id="settings-page-size"
                            ariaLabel="Select page size"
                            value={pageSizePresetId}
                            options={pageSizeOptions}
                            onChange={nextValue => {
                                const preset = PAGE_SIZE_PRESETS.find(candidate => candidate.id === nextValue);

                                if (!preset) {
                                    return;
                                }

                                onUpdatePageSettings({
                                    widthPx: preset.widthPx,
                                    heightPx: preset.heightPx,
                                });
                            }}
                        />
                    </div>
                    <div className={formControlStyles.field}>
                        <span className={formControlStyles.label}>Top margin</span>
                        <FormSelect
                            id="settings-margin-top"
                            ariaLabel="Select top margin rows"
                            value={localTopMarginRows}
                            options={marginRowOptions}
                            onChange={nextValue => {
                                setLocalTopMarginRows(Number(nextValue));
                                startTransition(() => {
                                    onUpdatePageSettings({marginTopPx: Number(nextValue) * fontSizePx});
                                });
                            }}
                        />
                    </div>
                    <div className={formControlStyles.field}>
                        <span className={formControlStyles.label}>Bottom margin</span>
                        <FormSelect
                            id="settings-margin-bottom"
                            ariaLabel="Select bottom margin rows"
                            value={localBottomMarginRows}
                            options={marginRowOptions}
                            onChange={nextValue => {
                                setLocalBottomMarginRows(Number(nextValue));
                                startTransition(() => {
                                    onUpdatePageSettings({marginBottomPx: Number(nextValue) * fontSizePx});
                                });
                            }}
                        />
                    </div>
                </div>
                <div className={styles.pageSchematic} style={{...pagePreviewStyle, ...localSchematicOverride}}>
                    <div className={styles.pageSchematicMarginTop} />
                    <div className={styles.pageSchematicMiddle}>
                        <div className={clsx(styles.pageSchematicMargin, styles.pageSchematicMarginLeft)} />
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
                        <div className={clsx(styles.pageSchematicMargin, styles.pageSchematicMarginRight)} />
                    </div>
                    <div className={styles.pageSchematicMarginBottom} />
                </div>
                <div className={sharedStyles.indentSliderTrack} style={{...sliderStyle, ...localSliderStyleOverride}}>
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
                        value={localSliderStart}
                        onChange={event => {
                            const rawStart = Number.parseFloat(event.target.value);
                            const maxStart = clamp(
                                latestEnd.current - MIN_PAGE_CONTENT_WIDTH_PX,
                                minSliderStart,
                                previewReferenceTotal,
                            );
                            const next = clamp(rawStart, minSliderStart, maxStart);

                            latestStart.current = next;
                            setLocalSliderStart(next);
                        }}
                        onPointerUp={() => {
                            const nextRightPx = previewReferenceTotal - latestEnd.current;

                            onUpdatePageSettings({marginLeftPx: latestStart.current, marginRightPx: nextRightPx});
                        }}
                        aria-label="Left page margin"
                    />
                    <input
                        type="range"
                        className={clsx(sharedStyles.indentSliderInput, sharedStyles.indentSliderInputEnd)}
                        min={0}
                        max={previewReferenceTotal}
                        step={marginSliderStep}
                        value={localSliderEnd}
                        onChange={event => {
                            const rawEnd = Number.parseFloat(event.target.value);
                            const minEnd = clamp(
                                latestStart.current + MIN_PAGE_CONTENT_WIDTH_PX,
                                0,
                                maxSliderEnd,
                            );
                            const next = clamp(rawEnd, minEnd, maxSliderEnd);

                            latestEnd.current = next;
                            setLocalSliderEnd(next);
                        }}
                        onPointerUp={() => {
                            const nextRightPx = previewReferenceTotal - latestEnd.current;

                            onUpdatePageSettings({
                                marginLeftPx: latestStart.current,
                                marginRightPx: clamp(nextRightPx, MIN_PAGE_MARGIN_HORIZONTAL_PX, previewReferenceTotal),
                            });
                        }}
                        aria-label="Right page margin"
                    />
                </div>
                <div className={sharedStyles.indentSliderLabels}>
                    <span>{'Left: '}{localLeftMarginInches}</span>
                    <span>{localContentWidthInches}{' wide'}</span>
                    <span>{'Right: '}{localRightMarginInches}</span>
                </div>
            </div>
        </div>
    );
};
