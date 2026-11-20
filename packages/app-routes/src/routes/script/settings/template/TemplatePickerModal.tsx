import {
    ALL_FORMAT_TEMPLATES,
    type EditorSettings,
    type FormatTemplateId,
    getFormatTemplate,
} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {
    Button,
    ChangeSummary,
    HelpCircleIcon,
    ModalActions,
    ModalDialog,
    ModalHeader,
    Notice,
    Switch,
    Tooltip,
    useToastController,
} from '@stagistic/ui';
import clsx from 'clsx';
import {
    type KeyboardEvent,
    useRef,
    useState,
} from 'react';

import styles from './formatTemplate.module.css';
import {templateChanges} from './templateChanges';
import {TemplateSamplePage} from './TemplateSamplePage';

const DEFAULT_TEMPLATE_ID: FormatTemplateId = 'stagistic-default';

/** The one place a template is applied; choosing in the list only previews it. */
export const TemplatePickerModal = ({
    initialId,
    appliedId,
    current,
    onClose,
    onApply,
}: {
    initialId: FormatTemplateId,
    appliedId: FormatTemplateId | null,
    current: EditorSettings,
    onClose: () => void,
    onApply: (id: FormatTemplateId, options: {lock: boolean}) => Promise<void>,
}) => {
    const [selectedId, setSelectedId] = useState(initialId);
    const [lock, setLock] = useState(true);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {addToast} = useToastController();
    const tabsRef = useRef<HTMLDivElement>(null);
    const template = requireValue(getFormatTemplate(selectedId));
    const reset = template.id === DEFAULT_TEMPLATE_ID;
    const changes = templateChanges(current, template);
    const isApplied = template.id === appliedId && lock;

    const selectByOffset = (event: KeyboardEvent<HTMLDivElement>) => {
        const offset = {ArrowDown: 1, ArrowUp: -1}[event.key];

        if (!offset) return;

        event.preventDefault();

        const index = ALL_FORMAT_TEMPLATES.findIndex(item => item.id === selectedId);
        const next = ALL_FORMAT_TEMPLATES[(index + offset + ALL_FORMAT_TEMPLATES.length) % ALL_FORMAT_TEMPLATES.length];

        setSelectedId(next.id);
        tabsRef.current?.querySelector<HTMLButtonElement>(`[data-template-id="${next.id}"]`)?.focus();
    };

    return (
        <ModalDialog
            isOpen
            ariaLabel="Choose format template"
            dialogClassName={styles.pickerDialog}
            initialFocus={dialog => dialog.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')}
            onClose={() => {
                if (!pending) onClose();
            }}
        >
            <ModalHeader title="Choose format template" />
            <div className={styles.pickerLayout}>
                <div
                    ref={tabsRef}
                    className={styles.templateTabs}
                    role="tablist"
                    aria-label="Format templates"
                    aria-orientation="vertical"
                    tabIndex={-1}
                    onKeyDown={selectByOffset}
                >
                    {ALL_FORMAT_TEMPLATES.map(item => {
                        const isSelected = item.id === selectedId;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                id={`template-tab-${item.id}`}
                                data-template-id={item.id}
                                aria-selected={isSelected}
                                aria-controls="template-detail"
                                tabIndex={isSelected ? 0 : -1}
                                className={clsx(styles.templateTab, isSelected && styles.active)}
                                onClick={() => setSelectedId(item.id)}
                            >
                                <span className={styles.templateName}>
                                    {item.label}
                                    {item.id === appliedId ? ' (current)' : ''}
                                </span>
                                <span className={styles.templateDescription}>{item.description}</span>
                            </button>
                        );
                    })}
                </div>
                <div
                    id="template-detail"
                    className={styles.templateDetail}
                    role="tabpanel"
                    aria-labelledby={`template-tab-${template.id}`}
                >
                    <TemplateSamplePage template={template} current={current} />
                    {changes.length > 0 ? <ChangeSummary items={changes} /> : <p className={styles.noChanges}>Matches your current format.</p>}
                </div>
            </div>
            {error ? <Notice variant="error">{error}</Notice> : null}
            <ModalActions spacing="lg">
                <Button
                    isPending={pending}
                    isDisabled={isApplied}
                    onPress={() => {
                        setPending(true);
                        setError(null);
                        void onApply(template.id, {lock: !reset && lock}).then(() => {
                            onClose();
                            addToast({title: `${template.label} applied`, variant: 'success'});
                        }).catch(() => setError('Could not save the format. Try again.'))
                            .finally(() => setPending(false));
                    }}
                >{reset ? 'Reset to Stagistic Default' : `Use ${template.label}`}
                </Button>
                <Button variant="ghost" isDisabled={pending} onPress={onClose}>Cancel</Button>
                {!reset ? (
                    <div className={clsx(styles.lockOption, styles.lockOptionEnd)}>
                        <Switch isSelected={lock} onChange={setLock} isDisabled={pending}>Lock to template</Switch>
                        <Tooltip label="Block styles follow the template and stay read-only until you unlock it.">
                            <button type="button" className={styles.helpButton} aria-label="About template lock">
                                <HelpCircleIcon aria-hidden="true" />
                            </button>
                        </Tooltip>
                    </div>
                ) : null}
            </ModalActions>
        </ModalDialog>
    );
};
