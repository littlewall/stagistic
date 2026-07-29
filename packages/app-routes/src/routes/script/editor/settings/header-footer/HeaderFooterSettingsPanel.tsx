import {
    type HeaderFooterAlignment,
    type HeaderFooterCellSettings,
    type HeaderFooterSettings,
    type HeaderFooterSettingsPatch,
    resolveDraftDate,
    type TitlePageSettings,
} from '@stagistic/script';
import {
    BoldIcon,
    Button,
    clsx,
    formControlStyles,
    ItalicIcon,
    Switch,
    UnderlineIcon,
} from '@stagistic/ui';
import {
    useRef,
    useState,
} from 'react';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import styles from './HeaderFooterSettingsPanel.module.css';

type Area = 'header' | 'footer';
type Selection = {area: Area, alignment: HeaderFooterAlignment};

interface HeaderFooterSettingsPanelProps {
    settings: HeaderFooterSettings,
    scriptTitle: string,
    titlePageSettings: TitlePageSettings,
    onUpdate: (patch: HeaderFooterSettingsPatch) => void,
}

const ALIGNMENTS: HeaderFooterAlignment[] = [
    'left',
    'center',
    'right',
];
const VARIABLES = [
    {label: 'Page mark', token: '{{page}}'},
    {label: 'Script title', token: '{{script_title}}'},
    {label: 'Draft date', token: '{{draft_date}}'},
] as const;

// The page mark is `act-scene-page`: Roman act number, scene number, page number.
const PAGE_MARK_PREVIEW = 'I-1-1';
// The integrated page number uses the `#.` format (page number + dot).
const PAGE_NUMBER_TOKEN = '{{page_number}}';
const PAGE_NUMBER_PREVIEW = '1.';

// These cells have fixed content — only their style (B/I/U) and editor visibility can change.
const getFixedCell = (
    area: Area,
    alignment: HeaderFooterAlignment,
): {label: string, example: string} | null => {
    if (area === 'header' && alignment === 'right') {
        return {label: 'Page number', example: PAGE_MARK_PREVIEW};
    }

    if (area === 'footer' && alignment === 'center') {
        return {label: 'Integrated page number', example: PAGE_NUMBER_PREVIEW};
    }

    return null;
};

const resolvePreview = (text: string, scriptTitle: string, draftDate: string) => text
    .replaceAll('{{page}}', PAGE_MARK_PREVIEW)
    .replaceAll(PAGE_NUMBER_TOKEN, PAGE_NUMBER_PREVIEW)
    .replaceAll('{{script_title}}', scriptTitle || 'Untitled')
    .replaceAll('{{draft_date}}', draftDate);

export const HeaderFooterSettingsPanel = ({
    settings,
    scriptTitle,
    titlePageSettings,
    onUpdate,
}: HeaderFooterSettingsPanelProps) => {
    const draftDate = resolveDraftDate(titlePageSettings);
    const [selection, setSelection] = useState<Selection | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const activeCell = selection ? settings[selection.area][selection.alignment] : null;
    const activeFixed = selection ? getFixedCell(selection.area, selection.alignment) : null;

    const selectCell = (nextSelection: Selection) => {
        setSelection(nextSelection);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const updateActiveCell = (patch: Partial<HeaderFooterCellSettings>) => {
        if (!selection || !activeCell) {
            return;
        }

        onUpdate({
            [selection.area]: {
                [selection.alignment]: {...activeCell, ...patch},
            },
        });
    };

    const insertVariable = (token: string) => {
        if (!activeCell) {
            return;
        }

        const input = inputRef.current;
        const start = input?.selectionStart ?? activeCell.text.length;
        const end = input?.selectionEnd ?? start;
        const nextText = `${activeCell.text.slice(0, start)}${token}${activeCell.text.slice(end)}`;

        updateActiveCell({text: nextText});
        requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(start + token.length, start + token.length);
        });
    };

    const renderRow = (area: Area) => (
        <section className={styles.previewSection} aria-label={`${area} preview`}>
            <span className={styles.previewLabel}>{area}</span>
            <div className={styles.previewRow}>
                {ALIGNMENTS.map(alignment => {
                    const cell = settings[area][alignment];
                    const isActive = selection?.area === area && selection.alignment === alignment;
                    const displayText = resolvePreview(cell.text, scriptTitle, draftDate);

                    return (
                        <Button
                            key={alignment}
                            variant="ghost"
                            className={clsx(styles.previewCell, styles[alignment], isActive && styles.activeCell)}
                            onPress={() => selectCell({area, alignment})}
                            aria-label={`Edit ${alignment} ${area}`}
                            aria-pressed={isActive}
                        >
                            <span
                                className={styles.previewText}
                                data-bold={cell.isBold || undefined}
                                data-italic={cell.isItalic || undefined}
                                data-underline={cell.isUnderline || undefined}
                            >
                                {displayText || `Add ${alignment} text`}
                            </span>
                        </Button>
                    );
                })}
            </div>
        </section>
    );

    return (
        <div className={panelStyles.panelStack}>
            <h3 className={panelStyles.panelTitle}>Headers and footers</h3>
            <div className={styles.composer}>
                {renderRow('header')}
                <div className={styles.editor}>
                    <div className={styles.editorToolbar}>
                        <div className={styles.formattingGroup} aria-label="Text formatting">
                            <Button
                                variant="ghost"
                                className={clsx(styles.formatButton, activeCell?.isBold && styles.activeFormat)}
                                isDisabled={!activeCell}
                                onPress={() => updateActiveCell({isBold: !activeCell?.isBold})}
                                aria-label="Bold"
                                aria-pressed={activeCell?.isBold ?? false}
                            ><BoldIcon />
                            </Button>
                            <Button
                                variant="ghost"
                                className={clsx(styles.formatButton, activeCell?.isItalic && styles.activeFormat)}
                                isDisabled={!activeCell}
                                onPress={() => updateActiveCell({isItalic: !activeCell?.isItalic})}
                                aria-label="Italic"
                                aria-pressed={activeCell?.isItalic ?? false}
                            ><ItalicIcon />
                            </Button>
                            <Button
                                variant="ghost"
                                className={clsx(styles.formatButton, activeCell?.isUnderline && styles.activeFormat)}
                                isDisabled={!activeCell}
                                onPress={() => updateActiveCell({isUnderline: !activeCell?.isUnderline})}
                                aria-label="Underline"
                                aria-pressed={activeCell?.isUnderline ?? false}
                            ><UnderlineIcon />
                            </Button>
                        </div>
                        <Switch
                            isDisabled={!activeCell}
                            isSelected={activeCell?.isHiddenInEditor ?? false}
                            onChange={isHiddenInEditor => updateActiveCell({isHiddenInEditor})}
                        >Hide in editor
                        </Switch>
                    </div>
                    {activeFixed
                        ? (
                            <div className={styles.fixedNote}>
                                <span className={styles.fixedNoteLabel}>{activeFixed.label}</span>
                                <span className={styles.fixedNoteExample}>{activeFixed.example}</span>
                            </div>
                        )
                        : (
                            <>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className={formControlStyles.input}
                                    disabled={!activeCell}
                                    value={activeCell?.text ?? ''}
                                    placeholder={selection ? 'Enter text or add a variable' : 'Select a header or footer area'}
                                    onChange={event => updateActiveCell({text: event.target.value})}
                                    aria-label="Header or footer content"
                                />
                                <div className={styles.variables} aria-label="Variables">
                                    {VARIABLES.map(variable => (
                                        <Button
                                            key={variable.token}
                                            variant="outline"
                                            size="sm"
                                            className={styles.variableButton}
                                            isDisabled={!activeCell}
                                            onPress={() => insertVariable(variable.token)}
                                        >{variable.label}
                                        </Button>
                                    ))}
                                </div>
                            </>
                        )}
                </div>
                {renderRow('footer')}
            </div>
        </div>
    );
};
