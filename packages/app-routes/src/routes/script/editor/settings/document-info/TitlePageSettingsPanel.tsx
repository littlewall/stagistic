import type {
    TitlePageDateFormat,
    TitlePageSettings,
} from '@stagistic/script';
import {
    InputTable,
    type InputTableColumnDef,
    type InputTableRow,
} from '@stagistic/ui';
import {useCallback, useMemo} from 'react';

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

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import styles from './TitlePageSettingsPanel.module.css';

const CREDITS_COLUMNS: readonly InputTableColumnDef[] = [
    {
        key: 'credit', label: 'Credit', type: 'string', placeholder: 'Written by',
    }, {
        key: 'authors', label: 'Author(s)', type: 'string-array', placeholder: 'Author name', addEntryLabel: 'Add author',
    },
];

const CREDITS_ROW_COUNT = {type: 'dynamic' as const, min: 1};

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
    const draftDatePreview = (() => {
        if (draftDateMode === 'auto') {
            return formatDatePreview(getTodayIso(), dateFormat);
        }

        return settings.draftDate ? formatDatePreview(settings.draftDate, dateFormat) : '';
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
                    <label className={styles.fieldLabel} htmlFor="tp-title">Title</label>
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
                    <label className={styles.fieldLabel} htmlFor="tp-subtitle">Subtitle</label>
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
                    <label className={styles.fieldLabel} htmlFor="tp-source">Source</label>
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
                <div className={styles.sectionTitle}>Draft Date</div>
                <div className={styles.draftDateRow}>
                    <div className={styles.draftDateField}>
                        <label className={styles.subFieldLabel} htmlFor="tp-date-format">Date format</label>
                        <select
                            id="tp-date-format"
                            className={styles.select}
                            value={dateFormat}
                            onChange={e => {
                                onUpdate({dateFormat: e.target.value as TitlePageDateFormat});
                            }}
                        >
                            <option value="dmy">dd/mm/yyyy</option>
                            <option value="mdy">mm/dd/yyyy</option>
                        </select>
                    </div>
                    <div className={styles.draftDateField}>
                        <label className={styles.subFieldLabel} htmlFor="tp-date">Date</label>
                        <input
                            id="tp-date"
                            type="date"
                            className={styles.dateInput}
                            disabled={draftDateMode === 'auto'}
                            value={settings.draftDate ?? ''}
                            onChange={e => {
                                onUpdate({draftDate: e.target.value || undefined});
                            }}
                        />
                    </div>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={draftDateMode === 'auto'}
                            onChange={e => {
                                onUpdate({draftDateMode: e.target.checked ? 'auto' : 'manual'});
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
                    <label className={styles.fieldLabel} htmlFor="tp-copyright">Copyright</label>
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
                    <label className={styles.fieldLabel} htmlFor="tp-contact">Contact</label>
                    <textarea
                        id="tp-contact"
                        className={styles.textarea}
                        placeholder={'Name\nAddress\nPhone / Email'}
                        value={settings.contact ?? ''}
                        onChange={e => {
                            handleContactChange(e.target.value);
                        }}
                    />
                    <span className={styles.fieldHint}>No blank lines between lines of text.</span>
                </div>
            </div>
        </div>
    );
};
