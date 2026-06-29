type CueRangeIconProps = {
    hollowEndpoint?: 'start' | 'end',
};

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
        r={style === 'hollow' ? '2.3' : '2.05'}
        fill={style === 'hollow' ? 'none' : 'currentColor'}
        stroke={style === 'hollow' ? 'currentColor' : 'none'}
        strokeWidth="2"
        data-cue-point={name}
        data-cue-point-style={style}
    />
);

export const CueRangeIcon = ({hollowEndpoint}: CueRangeIconProps) => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        data-cue-icon="range"
    >
        <line
            x1={hollowEndpoint === 'start' ? '7.3' : '5'}
            x2={hollowEndpoint === 'end' ? '16.7' : '19'}
            y1="12"
            y2="12"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
        />
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

export const CueHitIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        data-cue-icon="hit"
    >
        <line
            x1="5"
            x2="19"
            y1="12"
            y2="12"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
        />
        <CuePoint
            cx={12}
            name="center"
            style="filled"
        />
    </svg>
);
