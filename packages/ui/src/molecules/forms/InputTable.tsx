import {clsx} from 'clsx';

import styles from './InputTable.module.css';

interface StringColumnDef {
    key: string,
    label: string,
    type: 'string',
    placeholder?: string,
    width?: string,
}

interface StringArrayColumnDef {
    key: string,
    label: string,
    type: 'string-array',
    placeholder?: string,
    addEntryLabel?: string,
    width?: string,
}

export type InputTableColumnDef = StringColumnDef | StringArrayColumnDef;

export type InputTableRowCount =
    | {type: 'fixed', count: number}
    | {
        type: 'dynamic', min?: number, max?: number,
    };

export type InputTableRow = Record<string, string | string[]>;

export interface InputTableProps {
    columns: readonly InputTableColumnDef[],
    rows: readonly InputTableRow[],
    onChange: (rows: InputTableRow[]) => void,
    rowCount?: InputTableRowCount,
    addRowLabel?: string,
}

const getCellString = (row: InputTableRow, key: string): string => {
    const v = row[key];

    return typeof v === 'string' ? v : '';
};

const getCellArray = (row: InputTableRow, key: string): string[] => {
    const v = row[key];

    return Array.isArray(v) ? v : [''];
};

const makeEmptyRow = (columns: readonly InputTableColumnDef[]): InputTableRow => {
    const row: InputTableRow = {};

    for (const col of columns) {
        row[col.key] = col.type === 'string-array' ? [''] : '';
    }

    return row;
};

const StringArrayCell = ({
    values,
    placeholder,
    addEntryLabel,
    onChange,
}: {
    values: string[],
    placeholder?: string,
    addEntryLabel?: string,
    onChange: (values: string[]) => void,
}) => (
    <div className={styles.arrayCell}>
        {values.map((val, i) => (
            <div key={i} className={styles.arrayEntry}>
                <input
                    type="text"
                    className={clsx(
                        styles.cellInput,
                        values.length > 1 ? styles.withDelete : null,
                    )}
                    value={val}
                    placeholder={placeholder}
                    onChange={e => {
                        onChange(values.map((v, vi) => vi === i ? e.target.value : v));
                    }}
                />
                {values.length > 1 ? (
                    <button
                        type="button"
                        className={styles.removeEntryButton}
                        onClick={() => {
                            onChange(values.filter((_, vi) => vi !== i));
                        }}
                        aria-label="Remove entry"
                    >
                        ×
                    </button>
                ) : null}
            </div>
        ))}
        <button
            type="button"
            className={styles.addEntryButton}
            onClick={() => {
                onChange([...values, '']);
            }}
        >
            + {addEntryLabel ?? 'Add entry'}
        </button>
    </div>
);

export const InputTable = ({
    columns,
    rows,
    onChange,
    rowCount,
    addRowLabel,
}: InputTableProps) => {
    const showDeleteColumn = rowCount?.type !== 'fixed';
    const columnWidths = columns.map(c => c.width ?? '1fr');
    const gridTemplateColumns = [...columnWidths, ...showDeleteColumn ? ['24px'] : []].join(' ');

    const canRemoveRow = showDeleteColumn && rows.length > (
        rowCount?.type === 'dynamic' ? rowCount.min ?? 1 : 1
    );

    const canAddRow = showDeleteColumn && (
        rowCount?.type !== 'dynamic' || rowCount.max === undefined || rows.length < rowCount.max
    );

    const handleCellChange = (rowIndex: number, key: string, value: string | string[]) => {
        onChange(rows.map((row, i) => i === rowIndex ? {...row, [key]: value} : row));
    };

    const handleRemoveRow = (rowIndex: number) => {
        onChange(rows.filter((_, i) => i !== rowIndex));
    };

    const handleAddRow = () => {
        onChange([...rows, makeEmptyRow(columns)]);
    };

    return (
        <div className={styles.table}>
            <div className={styles.headerRow} style={{gridTemplateColumns}}>
                {columns.map(col => (
                    <div key={col.key} className={styles.headerCell}>
                        {col.label}
                    </div>
                ))}
                {showDeleteColumn ? <div /> : null}
            </div>
            {rows.map((row, rowIndex) => (
                <div
                    key={rowIndex}
                    className={styles.dataRow}
                    style={{gridTemplateColumns}}
                >
                    {columns.map(col => (
                        <div key={col.key} className={styles.dataCell}>
                            {col.type === 'string' ? (
                                <input
                                    type="text"
                                    className={styles.cellInput}
                                    value={getCellString(row, col.key)}
                                    placeholder={col.placeholder}
                                    onChange={e => {
                                        handleCellChange(rowIndex, col.key, e.target.value);
                                    }}
                                />
                            ) : (
                                <StringArrayCell
                                    values={getCellArray(row, col.key)}
                                    placeholder={col.placeholder}
                                    addEntryLabel={col.addEntryLabel}
                                    onChange={v => {
                                        handleCellChange(rowIndex, col.key, v);
                                    }}
                                />
                            )}
                        </div>
                    ))}
                    {showDeleteColumn ? (
                        <div className={styles.deleteCell}>
                            {canRemoveRow ? (
                                <button
                                    type="button"
                                    className={styles.removeRowButton}
                                    onClick={() => {
                                        handleRemoveRow(rowIndex);
                                    }}
                                    aria-label="Remove row"
                                >
                                    ×
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ))}
            {canAddRow ? (
                <div className={styles.footer} style={{gridTemplateColumns}}>
                    <button
                        type="button"
                        className={styles.addRowButton}
                        onClick={handleAddRow}
                    >
                        + {addRowLabel ?? 'Add row'}
                    </button>
                </div>
            ) : null}
        </div>
    );
};
