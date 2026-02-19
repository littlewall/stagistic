import {clsx} from '@stagistic/ui';
import {
    type CSSProperties,
    type ReactNode,
} from 'react';

import styles from '../../ScriptEditorRoute.module.css';
import {
    SCREENPLAY_CHARS_PER_INCH,
} from './constants';
import {
    clamp,
    formatInches,
    formatNumeric,
} from './math';

interface ElementPreviewProps {
    toolbar?: ReactNode,
    previewStyle: CSSProperties,
    previewText: string,
    sliderStart: number,
    sliderEnd: number,
    previewReferenceChars: number,
    minPreviewContentChars: number,
    leftTotalInches: number,
    rightTotalInches: number,
    contentChars: number,
    onStartChange: (value: number) => void,
    onEndChange: (value: number) => void,
}

export const ElementPreview = ({
    toolbar,
    previewStyle,
    previewText,
    sliderStart,
    sliderEnd,
    previewReferenceChars,
    minPreviewContentChars,
    leftTotalInches,
    rightTotalInches,
    contentChars,
    onStartChange,
    onEndChange,
}: ElementPreviewProps) => {
    const defaultSliderStartChars = 0;
    const defaultSliderEndChars = previewReferenceChars;

    return (
        <div className={styles.previewCard} style={previewStyle}>
            {toolbar}
            <div className={styles.previewSpacingRow} />
            <div className={styles.previewLineCanvas}>
                <div className={styles.previewLineInner}>
                    <span className={styles.previewLineText}>{previewText}</span>
                </div>
            </div>
            <div className={styles.indentSliderTrack}>
                <span className={styles.indentSliderBase} />
                <span className={styles.indentSliderMiddleBase} />
                <span className={styles.indentSliderSelected} />
                <span className={styles.indentSliderDefaultStart} />
                <span className={styles.indentSliderDefaultEnd} />
                <input
                    type="range"
                    className={clsx(styles.indentSliderInput, styles.indentSliderInputStart)}
                    min={0}
                    max={previewReferenceChars}
                    step={1}
                    value={sliderStart}
                    onChange={event => {
                        const rawStart = Number.parseInt(event.target.value, 10);
                        const maxStart = Math.max(
                            defaultSliderStartChars,
                            sliderEnd - minPreviewContentChars,
                        );
                        const nextStart = clamp(rawStart, defaultSliderStartChars, maxStart);

                        onStartChange(nextStart);
                    }}
                    aria-label="Block start indent"
                />
                <input
                    type="range"
                    className={clsx(styles.indentSliderInput, styles.indentSliderInputEnd)}
                    min={0}
                    max={previewReferenceChars}
                    step={1}
                    value={sliderEnd}
                    onChange={event => {
                        const rawEnd = Number.parseInt(event.target.value, 10);
                        const minEnd = sliderStart + minPreviewContentChars;
                        const nextEnd = clamp(rawEnd, minEnd, defaultSliderEndChars);

                        onEndChange(nextEnd);
                    }}
                    aria-label="Block end indent"
                />
            </div>
            <div className={styles.indentSliderLabels}>
                <span>{'Start: '}{formatInches(leftTotalInches)}</span>
                <span>{formatNumeric(contentChars / SCREENPLAY_CHARS_PER_INCH)}&quot; / {contentChars} chars</span>
                <span>{'End: '}{formatInches(rightTotalInches)}</span>
            </div>
        </div>
    );
};
