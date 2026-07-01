import {
    buildPageMark,
    type HeaderFooterCellSettings,
    type HeaderFooterRowSettings,
    type HeaderFooterSettings,
    resolveHeaderFooterText,
} from '@stagistic/script';
import {clsx} from '@stagistic/ui';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type CSSProperties,
    type RefObject,
    useLayoutEffect,
    useState,
} from 'react';

import {usePageStructureMarks} from '../headerFooter/usePageStructureMarks';
import {usePaginationState} from '../headerFooter/usePaginationState';
import styles from './HeaderFooterOverlay.module.css';

const ALIGNMENTS = [
    'left',
    'center',
    'right',
] as const;

type HeaderFooterOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    headerFooter: HeaderFooterSettings,
    scriptTitle: string,
    draftDate: string,
};

type ContentGeometry = {
    top: number,
    left: number,
    width: number,
    height: number,
    innerWidth: number,
};

const getContentElement = (canvas: HTMLElement | null): HTMLElement | null => {
    const prosemirror = canvas?.querySelector<HTMLElement>('.ProseMirror');

    return prosemirror?.parentElement ?? null;
};

const renderCells = (
    row: HeaderFooterRowSettings,
    resolve: (cell: HeaderFooterCellSettings) => string,
) => ALIGNMENTS.map(alignment => {
    const cell = row[alignment];

    if (cell.isHiddenInEditor) {
        return null;
    }

    const text = resolve(cell);

    if (!text) {
        return null;
    }

    return (
        <span
            key={alignment}
            className={clsx(
                styles.cell,
                styles[alignment],
                cell.isBold && styles.bold,
                cell.isItalic && styles.italic,
                cell.isUnderline && styles.underline,
            )}
        >{text}
        </span>
    );
});

export const HeaderFooterOverlay = ({
    editor,
    canvasRef,
    headerFooter,
    scriptTitle,
    draftDate,
}: HeaderFooterOverlayProps) => {
    const pagination = usePaginationState(editor);
    const marks = usePageStructureMarks(editor, pagination?.pages ?? []);
    const [geometry, setGeometry] = useState<ContentGeometry | null>(null);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const content = getContentElement(canvas);

        if (!content) {
            setGeometry(null);

            return;
        }

        const measure = () => {
            const marginLeft = pagination?.marginLeft ?? 0;
            const marginRight = pagination?.marginRight ?? 0;

            setGeometry({
                top: content.offsetTop,
                left: content.offsetLeft,
                width: content.offsetWidth,
                height: content.offsetHeight,
                innerWidth: Math.max(0, content.clientWidth - marginLeft - marginRight),
            });
        };

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(content);

        return () => {
            observer.disconnect();
        };
    }, [canvasRef, pagination]);

    if (!editor || !pagination || !geometry || pagination.pageCount <= 0) {
        return null;
    }

    const {
        pageHeight, marginTop, marginBottom, marginLeft,
    } = pagination;

    const layerStyle: CSSProperties = {
        top: geometry.top,
        left: geometry.left,
        width: geometry.width,
        height: geometry.height,
    };

    return (
        <div
            className={styles.layer}
            style={layerStyle}
            aria-hidden="true"
        >
            {pagination.pages.map((page, index) => {
                const pageNumber = index + 1;
                const mark = marks[index] ?? {actIndex: null, sceneNumber: 0};
                const pageMark = buildPageMark({
                    actIndex: mark.actIndex,
                    sceneNumber: mark.sceneNumber,
                    pageNumber,
                });
                const resolve = (cell: HeaderFooterCellSettings) => resolveHeaderFooterText(cell.text, {
                    scriptTitle,
                    draftDate,
                    pageMark,
                    pageNumber,
                });
                const top = index * pageHeight;

                return (
                    <div key={`${page.startPos}-${index}`}>
                        <div
                            className={styles.band}
                            style={{
                                top,
                                left: marginLeft,
                                width: geometry.innerWidth,
                                height: marginTop,
                            }}
                        >
                            {renderCells(headerFooter.header, resolve)}
                        </div>
                        <div
                            className={styles.band}
                            style={{
                                top: top + pageHeight - marginBottom,
                                left: marginLeft,
                                width: geometry.innerWidth,
                                height: marginBottom,
                            }}
                        >
                            {renderCells(headerFooter.footer, resolve)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
