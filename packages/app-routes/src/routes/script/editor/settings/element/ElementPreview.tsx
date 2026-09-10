import {formControlStyles} from '@stagistic/ui';
import {
    type ReactNode,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import {
    SCREENPLAY_CHARS_PER_INCH,
} from '../constants';
import {IndentRangeSlider} from '../IndentRangeSlider';
import {
    clamp,
    formatInches,
    formatNumeric,
} from '../math';
import type {
    ElementPreviewHandlers,
    ElementPreviewModel,
} from '../types';
import styles from './ElementPreview.module.css';

interface ElementPreviewProps {
    toolbar?: ReactNode,
    model: ElementPreviewModel,
    handlers: ElementPreviewHandlers,
    previewStyleOverride?: React.CSSProperties,
}

export const ElementPreview = ({
    toolbar,
    model,
    handlers,
    previewStyleOverride,
}: ElementPreviewProps) => {
    const {
        previewStyle,
        previewText,
        sliderStart,
        sliderEnd,
        previewReferenceChars,
        minPreviewContentChars,
        zoneStartPercent,
        zoneEndPercent,
        leftTotalInches,
        rightTotalInches,
        hasSpacingAfter,
    } = model;
    const defaultSliderStartChars = 0;
    const defaultSliderEndChars = previewReferenceChars;

    const [localStart, setLocalStart] = useState(sliderStart);
    const [localEnd, setLocalEnd] = useState(sliderEnd);
    const latestStart = useRef(sliderStart);
    const latestEnd = useRef(sliderEnd);

    useLayoutEffect(() => {
        setLocalStart(sliderStart);
        latestStart.current = sliderStart;
    }, [sliderStart]);
    useLayoutEffect(() => {
        setLocalEnd(sliderEnd);
        latestEnd.current = sliderEnd;
    }, [sliderEnd]);

    const zoneWidth = zoneEndPercent - zoneStartPercent;
    const safeRef = Math.max(1, previewReferenceChars);
    const localContentChars = Math.max(minPreviewContentChars, localEnd - localStart);
    const localLeftTotalInches = leftTotalInches + (localStart - sliderStart) / SCREENPLAY_CHARS_PER_INCH;
    const localRightTotalInches = rightTotalInches + (sliderEnd - localEnd) / SCREENPLAY_CHARS_PER_INCH;
    const localSliderStyleOverride = {
        '--preview-indent-start-percent': `${zoneStartPercent + (localStart / safeRef) * zoneWidth}%`,
        '--preview-indent-end-percent': `${zoneStartPercent + (localEnd / safeRef) * zoneWidth}%`,
        '--preview-line-start-percent': `${zoneStartPercent + (localStart / safeRef) * zoneWidth}%`,
        '--preview-line-width': `${Math.max(6, ((localEnd - localStart) / safeRef) * zoneWidth)}%`,
    } as React.CSSProperties;

    return (
        <div
            className={formControlStyles.previewCard}
            style={{
                ...previewStyle, ...previewStyleOverride, ...localSliderStyleOverride,
            }}
        >
            {toolbar}
            <div className={styles.previewSpacingRow} />
            <div className={styles.previewLineCanvas}>
                <div className={styles.previewLineInner}>
                    <span className={styles.previewLineText}>{previewText}</span>
                </div>
            </div>
            {hasSpacingAfter ? (
                <div className={styles.previewSpacingAfterRow} />
            ) : null}
            <IndentRangeSlider
                start={{
                    value: localStart,
                    min: 0,
                    max: previewReferenceChars,
                    step: 1,
                    ariaLabel: 'Block start indent',
                    onChange: event => {
                        const rawStart = Number.parseInt(event.target.value, 10);
                        const maxStart = Math.max(
                            defaultSliderStartChars,
                            latestEnd.current - minPreviewContentChars,
                        );
                        const next = clamp(rawStart, defaultSliderStartChars, maxStart);

                        latestStart.current = next;
                        setLocalStart(next);
                    },
                    onCommit: () => handlers.onStartChange(latestStart.current),
                }}
                end={{
                    value: localEnd,
                    min: 0,
                    max: previewReferenceChars,
                    step: 1,
                    ariaLabel: 'Block end indent',
                    onChange: event => {
                        const rawEnd = Number.parseInt(event.target.value, 10);
                        const minEnd = latestStart.current + minPreviewContentChars;
                        const next = clamp(rawEnd, minEnd, defaultSliderEndChars);

                        latestEnd.current = next;
                        setLocalEnd(next);
                    },
                    onCommit: () => handlers.onEndChange(latestEnd.current),
                }}
                labels={(
                    <>
                        <span>{'Start: '}{formatInches(localLeftTotalInches)}</span>
                        <span>{formatNumeric(localContentChars / SCREENPLAY_CHARS_PER_INCH)}&quot; / {localContentChars} chars</span>
                        <span>{'End: '}{formatInches(localRightTotalInches)}</span>
                    </>
                )}
            />
        </div>
    );
};
