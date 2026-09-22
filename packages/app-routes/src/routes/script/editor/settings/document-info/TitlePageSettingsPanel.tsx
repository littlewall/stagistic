import {formatDatePreview, getTodayIso, type TitlePageDateFormat, type TitlePageSettings} from '@stagistic/script';
import {
    Checkbox,
    formControlStyles,
    FormSelect,
    type FormSelectOption,
    InputTable,
    type InputTableColumnDef,
    type InputTableRow,
    PanelHeader,
    SettingsGroup,
} from '@stagistic/ui';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {TitlePageLogoField} from './TitlePageLogoField';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import styles from './TitlePageSettingsPanel.module.css';

const CREDITS_COLUMNS: readonly InputTableColumnDef[] = [
    {
        key: 'credit',
        label: 'Credit',
        type: 'string',
        placeholder: 'Written by',
    },
    {
        key: 'authors',
        label: 'Author(s)',
        type: 'string-array',
        placeholder: 'Author name',
        addEntryLabel: 'Add author',
    },
];

const CREDITS_ROW_COUNT = {type: 'dynamic' as const, min: 1};

const DATE_FORMAT_OPTIONS: FormSelectOption[] = [
    {value: 'dmy', label: 'dd/mm/yyyy'},
    {value: 'mdy', label: 'mm/dd/yyyy'},
];

interface TitlePageSettingsPanelProps {
    scriptTitle: string;
    settings: TitlePageSettings;
    onUpdateScriptTitle: (title: string) => void;
    onUpdate: (patch: Partial<TitlePageSettings>) => void;
}

export const TitlePageSettingsPanel = ({scriptTitle, settings, onUpdateScriptTitle, onUpdate}: TitlePageSettingsPanelProps) => {
    const draftDateMode = settings.draftDateMode ?? 'auto';
    const dateFormat = settings.dateFormat ?? 'mdy';
    const [localDraftDateMode, setLocalDraftDateMode] = useState(draftDateMode);
    const [localDraftDate, setLocalDraftDate] = useState(settings.draftDate ?? '');
    const [localDateFormat, setLocalDateFormat] = useState(dateFormat);

    useEffect(() => {
        setLocalDraftDateMode(draftDateMode);
    }, [draftDateMode]);
    useEffect(() => {
        setLocalDraftDate(settings.draftDate ?? '');
    }, [settings.draftDate]);
    useEffect(() => {
        setLocalDateFormat(dateFormat);
    }, [dateFormat]);

    const draftDatePreview = (() => {
        if (localDraftDateMode === 'auto') {
            return formatDatePreview(getTodayIso(), localDateFormat);
        }

        return localDraftDate ? formatDatePreview(localDraftDate, localDateFormat) : '';
    })();

    const creditRows = useMemo<InputTableRow[]>(
        () =>
            (settings.credits ?? [{credit: 'Written by', authors: ['']}]).map(c => ({
                credit: c.credit,
                authors: c.authors,
            })),
        [settings.credits],
    );

    const handleCreditsChange = useCallback(
        (rows: InputTableRow[]) => {
            onUpdate({
                credits: rows.map(r => ({
                    credit: r['credit'] as string,
                    authors: r['authors'] as string[],
                })),
            });
        },
        [onUpdate],
    );

    const handleContactChange = useCallback(
        (value: string) => {
            onUpdate({contact: value.replace(/\n{2,}/g, '\n')});
        },
        [onUpdate],
    );

    return (
        <SettingsGroup gap="2xl" className={panelStyles.panelTokens}>
            <PanelHeader level={3} title="Title page" />
            <div className={styles.section}>
                <TitlePageLogoField logo={settings.logo} onChange={logo => onUpdate({logo})} />
            </div>
            <div className={styles.section}>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="tp-title">
                        Title
                    </label>
                    <input
                        id="tp-title"
                        type="text"
                        className={formControlStyles.input}
                        placeholder="Untitled script"
                        value={scriptTitle}
                        onChange={event => onUpdateScriptTitle(event.target.value)}
                    />
                </div>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="tp-subtitle">
                        Subtitle
                    </label>
                    <input
                        id="tp-subtitle"
                        type="text"
                        className={formControlStyles.input}
                        placeholder="Optional subtitle"
                        value={settings.subtitle ?? ''}
                        onChange={e => {
                            onUpdate({subtitle: e.target.value || undefined});
                        }}
                    />
                </div>
            </div>
            <div className={styles.section}>
                <InputTable
                    columns={CREDITS_COLUMNS}
                    rows={creditRows}
                    onChange={handleCreditsChange}
                    rowCount={CREDITS_ROW_COUNT}
                    addRowLabel="Add credit row"
                />
            </div>
            <div className={styles.section}>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="tp-source">
                        Source
                    </label>
                    <input
                        id="tp-source"
                        type="text"
                        className={formControlStyles.input}
                        placeholder="Based on…"
                        value={settings.source ?? ''}
                        onChange={e => {
                            onUpdate({source: e.target.value || undefined});
                        }}
                    />
                </div>
            </div>
            <div className={styles.section}>
                <div className={styles.title}>Draft Date</div>
                <div className={styles.draftDateRow}>
                    <div className={styles.draftDateField}>
                        <label className={styles.subFieldLabel} htmlFor="tp-date-format">
                            Date format
                        </label>
                        <FormSelect
                            id="tp-date-format"
                            value={localDateFormat}
                            options={DATE_FORMAT_OPTIONS}
                            ariaLabel="Select date format"
                            onChange={nextValue => {
                                const nextDateFormat = nextValue as TitlePageDateFormat;

                                setLocalDateFormat(nextDateFormat);
                                onUpdate({dateFormat: nextDateFormat});
                            }}
                        />
                    </div>
                    <div className={styles.draftDateField}>
                        <label className={styles.subFieldLabel} htmlFor="tp-date">
                            Date
                        </label>
                        <input
                            id="tp-date"
                            type="date"
                            className={formControlStyles.input}
                            disabled={localDraftDateMode === 'auto'}
                            value={localDraftDate}
                            onChange={e => {
                                const nextDraftDate = e.target.value;

                                setLocalDraftDate(nextDraftDate);
                                onUpdate({draftDate: nextDraftDate || undefined});
                            }}
                        />
                    </div>
                    <Checkbox
                        className={styles.checkboxLabel}
                        isSelected={localDraftDateMode === 'auto'}
                        onChange={isSelected => {
                            const nextDraftDateMode = isSelected ? 'auto' : 'manual';

                            setLocalDraftDateMode(nextDraftDateMode);
                            onUpdate({draftDateMode: nextDraftDateMode});
                        }}
                    >
                        Automatic date of export
                    </Checkbox>
                    <div className={styles.draftDateField}>
                        <span className={styles.subFieldLabel}>Preview</span>
                        <span className={styles.draftDatePreview}>{draftDatePreview || '—'}</span>
                    </div>
                </div>
            </div>
            <div className={styles.section}>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="tp-copyright">
                        Copyright
                    </label>
                    <input
                        id="tp-copyright"
                        type="text"
                        className={formControlStyles.input}
                        placeholder="© 2026 Author Name"
                        value={settings.copyright ?? ''}
                        onChange={e => {
                            onUpdate({copyright: e.target.value || undefined});
                        }}
                    />
                </div>
            </div>
            <div className={styles.section}>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="tp-contact">
                        Contact
                    </label>
                    <textarea
                        id="tp-contact"
                        className={formControlStyles.textarea}
                        placeholder={'Name\nAddress\nPhone / Email'}
                        value={settings.contact ?? ''}
                        onChange={e => {
                            handleContactChange(e.target.value);
                        }}
                    />
                    <span className={styles.hint}>No blank lines between lines of text.</span>
                </div>
            </div>
        </SettingsGroup>
    );
};
