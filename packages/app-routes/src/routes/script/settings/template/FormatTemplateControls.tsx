import {
    type EditorSettings,
    type FormatTemplateId,
    getFormatTemplate,
    isStagisticDefaultFormat,
    type PdfFlowPreset,
} from '@stagistic/script';
import {ConfirmModal, Notice} from '@stagistic/ui';
import {type ReactNode, useState} from 'react';

import {FormatTemplateContext} from './FormatTemplateContext';
import {FormatTemplatePicker} from './FormatTemplatePicker';
import {TemplatePickerModal} from './TemplatePickerModal';

export const FormatTemplateControls = ({
    formatTemplateId,
    settings,
    onApply,
    onUnlock,
    onChangeRequested,
    onUpdatePdfFlow,
    children,
}: {
    formatTemplateId: FormatTemplateId | null,
    settings: EditorSettings,
    onApply: (id: FormatTemplateId, options: {lock: boolean}) => Promise<void>,
    onUnlock: () => Promise<void>,
    onChangeRequested?: () => void,
    onUpdatePdfFlow?: (patch: Partial<PdfFlowPreset>) => void,
    children: ReactNode | ((picker: ReactNode) => ReactNode),
}) => {
    const [pickerInitialId, setPickerInitialId] = useState<FormatTemplateId | null>(null);
    const [confirmUnlock, setConfirmUnlock] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const template = formatTemplateId ? getFormatTemplate(formatTemplateId) : undefined;
    const isDefault = isStagisticDefaultFormat(settings);
    const appliedId = formatTemplateId ?? (isDefault ? 'stagistic-default' : null);
    const openPicker = (id: FormatTemplateId | null) => setPickerInitialId(id ?? formatTemplateId ?? 'stagistic-default');
    const picker = <FormatTemplatePicker value={formatTemplateId} isDefault={isDefault} onChoose={openPicker} />;

    return (
        <FormatTemplateContext.Provider
            value={{
                template,
                updatePdfFlow: onUpdatePdfFlow,
                change: () => {
                    onChangeRequested?.();
                    openPicker(null);
                },
                resetToDefault: () => openPicker('stagistic-default'),
                unlock: () => setConfirmUnlock(true),
            }}
        >
            {typeof children === 'function' ? children(picker) : <>{picker}{children}</>}
            {pickerInitialId ? (
                <TemplatePickerModal
                    initialId={pickerInitialId}
                    appliedId={appliedId}
                    current={settings}
                    onClose={() => setPickerInitialId(null)}
                    onApply={onApply}
                />
            ) : null}
            <ConfirmModal
                isOpen={confirmUnlock}
                ariaLabel="Unlock format template"
                title="Unlock the whole template?"
                description="All block styles will keep their current values and become editable."
                confirmLabel="Unlock template"
                isPending={pending}
                lockWhilePending
                onClose={() => {
                    setConfirmUnlock(false);
                    setError(null);
                }}
                onConfirm={async () => {
                    setPending(true);
                    setError(null);
                    try {
                        await onUnlock();
                        setConfirmUnlock(false);
                    } catch {
                        setError('Could not unlock the format. Try again.');
                    } finally {
                        setPending(false);
                    }
                }}
                notes={error ? [<Notice key="error" variant="error">{error}</Notice>] : undefined}
            />
        </FormatTemplateContext.Provider>
    );
};
