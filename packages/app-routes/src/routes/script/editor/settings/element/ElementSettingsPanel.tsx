import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {
    startTransition, useEffect, useState,
} from 'react';

import styles from '../ScriptEditorSettingsPanel.module.css';
import type {
    ElementNumericModel,
    ElementSettingsPanelProps,
    UpdateBlockSettings,
} from '../types';
import {ElementFormattingToolbar} from './ElementFormattingToolbar';
import {ElementNumericControls} from './ElementNumericControls';
import {ElementPreview} from './ElementPreview';
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

    const {
        numeric, preview, formatting,
    } = viewModel;
    const fontSizePx = resolvedScriptSettings.typography.fontSizePx
        ?? DEFAULT_EDITOR_SETTINGS.typography.fontSizePx;

    const [localSpacingBefore, setLocalSpacingBefore] = useState(numeric.spacingBefore);
    const [localSpacingAfter, setLocalSpacingAfter] = useState(numeric.spacingAfter);
    const [localLineHeight, setLocalLineHeight] = useState(numeric.lineHeight);

    useEffect(() => {
        setLocalSpacingBefore(numeric.spacingBefore);
    }, [numeric.spacingBefore]);
    useEffect(() => {
        setLocalSpacingAfter(numeric.spacingAfter);
    }, [numeric.spacingAfter]);
    useEffect(() => {
        setLocalLineHeight(numeric.lineHeight);
    }, [numeric.lineHeight]);

    const previewStyleOverride = {
        '--preview-spacing-before': `${Math.max(0, localSpacingBefore) * fontSizePx}px`,
        '--preview-spacing-after': localSpacingAfter === undefined
            ? '0px'
            : `${Math.max(0, localSpacingAfter) * fontSizePx}px`,
        '--preview-line-height': String(localLineHeight),
    } as React.CSSProperties;

    const localNumericModel: ElementNumericModel = {
        ...numeric,
        spacingBefore: localSpacingBefore,
        spacingAfter: localSpacingAfter,
        lineHeight: localLineHeight,
    };

    const handleUpdateBlockSettings: UpdateBlockSettings = (bt, patch) => {
        if (patch.spacingBeforeEm !== undefined) setLocalSpacingBefore(patch.spacingBeforeEm);

        if (patch.spacingAfterEm !== undefined) setLocalSpacingAfter(patch.spacingAfterEm);

        if (patch.lineHeight !== undefined) setLocalLineHeight(patch.lineHeight);

        startTransition(() => onUpdateBlockSettings(bt, patch));
    };

    return (
        <div className={styles.panelStack}>
            <h3 className={styles.panelTitle}>{blockLabel}</h3>
            <ElementPreview
                model={preview}
                handlers={{
                    onStartChange: nextStart => {
                        onUpdateBlockSettings(blockType, {
                            indentLeftChars: nextStart,
                        });
                    },
                    onEndChange: nextEnd => {
                        onUpdateBlockSettings(blockType, {
                            indentRightChars: preview.previewReferenceChars - nextEnd,
                        });
                    },
                }}
                previewStyleOverride={previewStyleOverride}
                toolbar={(
                    <ElementFormattingToolbar
                        blockType={blockType}
                        model={formatting}
                        handlers={{onUpdateBlockSettings}}
                    />
                )}
            />
            <ElementNumericControls
                blockType={blockType}
                shortcutPrefix={shortcutPrefix}
                model={localNumericModel}
                handlers={{onUpdateBlockSettings: handleUpdateBlockSettings}}
            />
        </div>
    );
};
