import {DEFAULT_EDITOR_SETTINGS, isDefaultBlockSettings} from '@stagistic/script';
import {
    PanelHeader,
    SettingsGroup,
    Switch,
    UndoIcon,
} from '@stagistic/ui';
import {
} from 'react';

import {usePropState} from '../../../../../usePropState';
import {FormatSection} from '../../template/FormatSection';
import {useFormatTemplate} from '../../template/FormatTemplateContext';
import styles from '../ScriptEditorSettingsPanel.module.css';
import type {
    ElementNumericModel,
    ElementSettingsPanelProps,
    UpdateBlockSettings,
} from '../types';
import {ElementFormattingToolbar} from './ElementFormattingToolbar';
import {ElementNumericControls} from './ElementNumericControls';
import {ElementPreview} from './ElementPreview';
import elementStyles from './ElementSettingsPanel.module.css';
import {useElementSettingsViewModel} from './useElementSettingsViewModel';

export const ElementSettingsPanel = ({
    blockType,
    blockLabel,
    resolvedScriptSettings,
    shortcutPrefix,
    onResetBlockSettings,
    onUpdateBlockSettings,
}: ElementSettingsPanelProps) => {
    const {template} = useFormatTemplate();
    const canReset = !isDefaultBlockSettings(resolvedScriptSettings, blockType);
    const viewModel = useElementSettingsViewModel({
        blockType,
        resolvedScriptSettings,
    });

    const {
        numeric,
        preview,
        formatting,
    } = viewModel;
    const fontSizePx = resolvedScriptSettings.typography.fontSizePx
        ?? DEFAULT_EDITOR_SETTINGS.typography.fontSizePx;

    const [localSpacingBefore, setLocalSpacingBefore] = usePropState(numeric.spacingBefore);
    const [localSpacingAfter, setLocalSpacingAfter] = usePropState(numeric.spacingAfter);
    const [localLineHeight, setLocalLineHeight] = usePropState(numeric.lineHeight);

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

        onUpdateBlockSettings(bt, patch);
    };

    return (
        <SettingsGroup gap="4xl" className={styles.panelTokens}>
            <div className={elementStyles.panelHeader}>
                <PanelHeader level={3} title={blockLabel} />
                {canReset && !template ? (
                    <button
                        type="button"
                        className={elementStyles.resetButton}
                        onClick={() => onResetBlockSettings(blockType)}
                    >
                        <UndoIcon aria-hidden="true" />
                        <span>Reset block settings</span>
                    </button>
                ) : null}
            </div>
            <FormatSection heading="Format">
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
                {blockType === 'stageDirection' ? <Switch isDisabled={Boolean(template)} isSelected={resolvedScriptSettings.blocks.stageDirection.parenWrap ?? false} onChange={parenWrap => onUpdateBlockSettings(blockType, {parenWrap})}>Wrap in parentheses</Switch> : null}
                <ElementNumericControls
                    blockType={blockType}
                    shortcutPrefix={shortcutPrefix}
                    model={localNumericModel}
                    handlers={{onUpdateBlockSettings: handleUpdateBlockSettings}}
                />
            </FormatSection>
            {numeric.shortcutOptions || numeric.nextElementOptions ? (
                <SettingsGroup gap="lg">
                    <PanelHeader level={4} size="section" title="Typing" />
                    <ElementNumericControls section="typing" blockType={blockType} shortcutPrefix={shortcutPrefix} model={localNumericModel} handlers={{onUpdateBlockSettings: handleUpdateBlockSettings}} />
                </SettingsGroup>
            ) : null}
        </SettingsGroup>
    );
};
