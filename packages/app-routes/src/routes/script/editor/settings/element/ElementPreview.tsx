import {clsx} from '@stagistic/ui';
import {
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    SCREENPLAY_CHARS_PER_INCH,
} from '../constants';
import {
    clamp,
    formatInches,
    formatNumeric,
} from '../math';
import sharedStyles from '../shared.module.css';
import type {
    ElementPreviewHandlers,
    ElementPreviewModel,
} from '../types';
import styles from './ElementPreview.module.css';

interface ElementPreviewProps {
    toolbar?: ReactNode,
    model: ElementPreviewModel,
    handlers: ElementPreviewHandlers,
}

export const ElementPreview = ({
    toolbar,
    model,
    handlers,
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

    useEffect(() => {
        setLocalStart(sliderStart);
        latestStart.current = sliderStart;
    }, [sliderStart]);
    useEffect(() => {
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
        <div className={sharedStyles.previewCard} style={{...previewStyle, ...localSliderStyleOverride}}>
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
            <div className={sharedStyles.indentSliderTrack}>
                <span className={sharedStyles.indentSliderBase} />
                <span className={sharedStyles.indentSliderMiddleBase} />
                <span className={sharedStyles.indentSliderSelected} />
                <span className={sharedStyles.indentSliderDefaultStart} />
                <span className={sharedStyles.indentSliderDefaultEnd} />
                <input
                    type="range"
                    className={clsx(sharedStyles.indentSliderInput, sharedStyles.indentSliderInputStart)}
                    min={0}
                    max={previewReferenceChars}
                    step={1}
                    value={localStart}
                    onChange={event => {
                        const rawStart = Number.parseInt(event.target.value, 10);
                        const maxStart = Math.max(
                            defaultSliderStartChars,
                            latestEnd.current - minPreviewContentChars,
                        );
                        const next = clamp(rawStart, defaultSliderStartChars, maxStart);

                        latestStart.current = next;
                        setLocalStart(next);
                    }}
                    onPointerUp={() => handlers.onStartChange(latestStart.current)}
                    aria-label="Block start indent"
                />
                <input
                    type="range"
                    className={clsx(sharedStyles.indentSliderInput, sharedStyles.indentSliderInputEnd)}
                    min={0}
                    max={previewReferenceChars}
                    step={1}
                    value={localEnd}
                    onChange={event => {
                        const rawEnd = Number.parseInt(event.target.value, 10);
                        const minEnd = latestStart.current + minPreviewContentChars;
                        const next = clamp(rawEnd, minEnd, defaultSliderEndChars);

                        latestEnd.current = next;
                        setLocalEnd(next);
                    }}
                    onPointerUp={() => handlers.onEndChange(latestEnd.current)}
                    aria-label="Block end indent"
                />
            </div>
            <div className={sharedStyles.indentSliderLabels}>
                <span>{'Start: '}{formatInches(localLeftTotalInches)}</span>
                <span>{formatNumeric(localContentChars / SCREENPLAY_CHARS_PER_INCH)}&quot; / {localContentChars} chars</span>
                <span>{'End: '}{formatInches(localRightTotalInches)}</span>
            </div>
        </div>
    );
};
