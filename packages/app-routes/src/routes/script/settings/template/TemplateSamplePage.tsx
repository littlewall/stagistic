import {
    applyFormatTemplate,
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type FormatTemplate,
    mergeEditorSettings,
} from '@stagistic/script';
import {
    type CSSProperties,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import styles from './formatTemplate.module.css';

const SAMPLE = [
    ['act', 'ACT I'],
    ['scene', 'SCENE ONE'],
    ['stageDirection', 'A quiet room. A door opens.'],
    ['character', 'MARA'],
    ['dialogue', 'There is still time to begin.'],
    ['aside', '(quietly)'],
    ['dialogue', 'Leave the light on.'],
    ['lyrics', 'A NEW DAY IS WAITING'],
] as const;

export const TemplateSamplePage = ({template, current = DEFAULT_EDITOR_SETTINGS}: {template: FormatTemplate, current?: EditorSettings}) => {
    const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, applyFormatTemplate({templateId: template.id, lock: false}, current).settings);
    const page = settings.page;
    const figureRef = useRef<HTMLElement>(null);
    const [zoom, setZoom] = useState(1);

    // Fit the page width to the preview so the sample stays readable at the dialog's size.
    useLayoutEffect(() => {
        const figure = figureRef.current;

        if (!figure) return;

        const update = () => setZoom(figure.clientWidth / page.widthPx);
        const observer = new ResizeObserver(update);

        update();
        observer.observe(figure);

        return () => observer.disconnect();
    }, [page.widthPx]);

    return (
        <figure ref={figureRef} className={styles.sample} aria-label={`${template.label} sample page`}>
            <div
                className={styles.samplePage}
                style={{
                    '--sample-width': `${page.widthPx}px`,
                    zoom,
                    padding: `${page.marginTopPx / 2}px ${page.marginRightPx}px ${page.marginTopPx / 2}px ${page.marginLeftPx}px`,
                    fontSize: settings.typography.fontSizePx,
                    lineHeight: settings.typography.lineHeight,
                } as CSSProperties}
            >
                {SAMPLE.map(([type, text], index) => {
                    const block = settings.blocks[type];

                    return (
                        <p
                            key={index}
                            style={{
                                paddingLeft: `${block.indentLeftChars ?? 0}ch`,
                                paddingRight: `${block.indentRightChars ?? 0}ch`,
                                marginTop: `${block.spacingBeforeEm ?? 0}em`,
                                marginBottom: `${block.spacingAfterEm ?? 0}em`,
                                textAlign: block.textAlign,
                                lineHeight: block.lineHeight,
                                fontSize: block.fontSizePx,
                                fontWeight: block.isBold ? 700 : 400,
                                fontStyle: block.isItalic ? 'italic' : 'normal',
                                textDecoration: block.isUnderline ? 'underline' : 'none',
                                textTransform: block.casing === 'uppercase' ? 'uppercase' : block.casing === 'lowercase' ? 'lowercase' : 'none',
                            }}
                        >{block.parenWrap ? `(${text})` : text}
                        </p>
                    );
                })}
            </div>
        </figure>
    );
};
