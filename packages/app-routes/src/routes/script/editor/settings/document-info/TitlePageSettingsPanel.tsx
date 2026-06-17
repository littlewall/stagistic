import type {
    TitlePageDateFormat,
    TitlePageSettings,
} from '@stagistic/script';
import {
    InputTable,
    type InputTableColumnDef,
    type InputTableRow,
} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import {
    SettingsSelect,
    type SettingsSelectOption,
} from '../SettingsSelect';
import styles from './TitlePageSettingsPanel.module.css';

const formatDatePreview = (isoDate: string, format: TitlePageDateFormat): string => {
    const match = (/^(\d{4})-(\d{2})-(\d{2})/).exec(isoDate);

    if (!match) {
        return '';
    }

    const [
        ,
        year,
        month,
        day,
    ] = match;

    return format === 'dmy' ? `${day}/${month}/${year}` : `${month}/${day}/${year}`;
};

const getTodayIso = (): string => {
    const d = new Date();
    const y = String(d.getFullYear());
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${y}-${m}-${day}`;
};

const CREDITS_COLUMNS: readonly InputTableColumnDef[] = [
    {
        key: 'credit', label: 'Credit', type: 'string', placeholder: 'Written by',
    }, {
        key: 'authors', label: 'Author(s)', type: 'string-array', placeholder: 'Author name', addEntryLabel: 'Add author',
    },
];

const CREDITS_ROW_COUNT = {type: 'dynamic' as const, min: 1};

const DATE_FORMAT_OPTIONS: SettingsSelectOption[] = [{value: 'dmy', label: 'dd/mm/yyyy'}, {value: 'mdy', label: 'mm/dd/yyyy'}];

interface TitlePageSettingsPanelProps {
    scriptTitle: string,
    settings: TitlePageSettings,
    onUpdate: (patch: Partial<TitlePageSettings>) => void,
}

export const TitlePageSettingsPanel = ({
    scriptTitle,
    settings,
    onUpdate,
}: TitlePageSettingsPanelProps) => {
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
        () => (settings.credits ?? [{credit: 'Written by', authors: ['']}]).map(c => ({
            credit: c.credit,
            authors: c.authors,
        }))
        , [settings.credits],
    );

    const handleCreditsChange = useCallback((rows: InputTableRow[]) => {
        onUpdate({
            credits: rows.map(r => ({
                credit: r['credit'] as string,
                authors: r['authors'] as string[],
            })),
        });
    }, [onUpdate]);

    const handleContactChange = useCallback((value: string) => {
        onUpdate({contact: value.replace(/\n{2,}/g, '\n')});
    }, [onUpdate]);

    return (
        <div className={panelStyles.panelStack}>
            <h3 className={panelStyles.panelTitle}>Title Page</h3>
            <div className={styles.section}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="tp-title">Title</label>
                    <input
                        id="tp-title"
                        type="text"
                        className={styles.textInput}
                        placeholder={scriptTitle || 'Untitled'}
                        value={settings.titleOverride ?? ''}
                        onChange={e => {
                            onUpdate({titleOverride: e.target.value || undefined});
                        }}
                    />
                </div>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="tp-subtitle">Subtitle</label>
                    <input
                        id="tp-subtitle"
                        type="text"
                        className={styles.textInput}
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
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="tp-source">Source</label>
                    <input
                        id="tp-source"
                        type="text"
                        className={styles.textInput}
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
                        <label className={styles.subFieldLabel} htmlFor="tp-date-format">Date format</label>
                        <SettingsSelect
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
                        <label className={styles.subFieldLabel} htmlFor="tp-date">Date</label>
                        <input
                            id="tp-date"
                            type="date"
                            className={styles.dateInput}
                            disabled={localDraftDateMode === 'auto'}
                            value={localDraftDate}
                            onChange={e => {
                                const nextDraftDate = e.target.value;

                                setLocalDraftDate(nextDraftDate);
                                onUpdate({draftDate: nextDraftDate || undefined});
                            }}
                        />
                    </div>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={localDraftDateMode === 'auto'}
                            onChange={e => {
                                const nextDraftDateMode = e.target.checked ? 'auto' : 'manual';

                                setLocalDraftDateMode(nextDraftDateMode);
                                onUpdate({draftDateMode: nextDraftDateMode});
                            }}
                        />
                        Automatic date of export
                    </label>
                    <div className={styles.draftDateField}>
                        <span className={styles.subFieldLabel}>Preview</span>
                        <span className={styles.draftDatePreview}>{draftDatePreview || '—'}</span>
                    </div>
                </div>
            </div>
            <div className={styles.section}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="tp-copyright">Copyright</label>
                    <input
                        id="tp-copyright"
                        type="text"
                        className={styles.textInput}
                        placeholder="© 2026 Author Name"
                        value={settings.copyright ?? ''}
                        onChange={e => {
                            onUpdate({copyright: e.target.value || undefined});
                        }}
                    />
                </div>
            </div>
            <div className={styles.section}>
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="tp-contact">Contact</label>
                    <textarea
                        id="tp-contact"
                        className={styles.textarea}
                        placeholder={'Name\nAddress\nPhone / Email'}
                        value={settings.contact ?? ''}
                        onChange={e => {
                            handleContactChange(e.target.value);
                        }}
                    />
                    <span className={styles.hint}>No blank lines between lines of text.</span>
                </div>
            </div>
        </div>
    );
};
