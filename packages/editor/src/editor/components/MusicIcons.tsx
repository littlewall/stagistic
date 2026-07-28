import {useId} from 'react';

type MusicRangeIconProps = {
    hollowEndpoint?: 'start' | 'end',
};

const MusicLine = ({maskId}: {maskId?: string}) => (
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

const MusicPoint = ({
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
        data-music-point={name}
        data-music-point-style={style}
    />
);

export const MusicRangeIcon = ({hollowEndpoint}: MusicRangeIconProps) => {
    const reactId = useId();
    const maskId = `music-range-${reactId.replaceAll(':', '')}`;
    const hollowPointX = hollowEndpoint === 'start' ? 5 : 19;

    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            data-music-icon="range"
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
            <MusicLine maskId={hollowEndpoint ? maskId : undefined} />
            <MusicPoint
                cx={5}
                name="start"
                style={hollowEndpoint === 'start' ? 'hollow' : 'filled'}
            />
            <MusicPoint
                cx={19}
                name="end"
                style={hollowEndpoint === 'end' ? 'hollow' : 'filled'}
            />
        </svg>
    );
};

export const MusicHitIcon = () => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        data-music-icon="hit"
    >
        <MusicLine />
        <MusicPoint
            cx={12}
            name="center"
            style="filled"
        />
    </svg>
);
