import {useId} from 'react';

type CueRangeIconProps = {
    hollowEndpoint?: 'start' | 'end',
};

const CueLine = ({maskId}: {maskId?: string}) => (
    <line
        x1="1.5"
        x2="22.5"
        y1="12"
        y2="12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        mask={maskId ? `url(#${maskId})` : undefined}
    />
);

const CuePoint = ({
    cx,
    style,
    name,
}: {
    cx: number,
    style: 'filled' | 'hollow',
    name: 'start' | 'center' | 'end',
}) => (
    <circle
        cx={cx}
        cy="12"
        r="2.6"
        fill={style === 'hollow' ? 'none' : 'currentColor'}
        stroke="currentColor"
        strokeWidth="2.4"
        data-cue-point={name}
        data-cue-point-style={style}
    />
);

export const CueRangeIcon = ({hollowEndpoint}: CueRangeIconProps) => {
    const reactId = useId();
    const maskId = `cue-range-${reactId.replaceAll(':', '')}`;
    const hollowPointX = hollowEndpoint === 'start' ? 5 : 19;

    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            data-cue-icon="range"
        >
            {hollowEndpoint ? (
                <defs>
                    <mask id={maskId} maskUnits="userSpaceOnUse">
                        <rect
                            width="24"
                            height="24"
                            fill="white"
                        />
                        <circle
                            cx={hollowPointX}
                            cy="12"
                            r="3.85"
                            fill="black"
                        />
                    </mask>
                </defs>
            ) : null}
            <CueLine maskId={hollowEndpoint ? maskId : undefined} />
            <CuePoint
                cx={5}
                name="start"
                style={hollowEndpoint === 'start' ? 'hollow' : 'filled'}
            />
            <CuePoint
                cx={19}
                name="end"
                style={hollowEndpoint === 'end' ? 'hollow' : 'filled'}
            />
        </svg>
    );
};

export const CueHitIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        data-cue-icon="hit"
    >
        <CueLine />
        <CuePoint
            cx={12}
            name="center"
            style="filled"
        />
    </svg>
);
