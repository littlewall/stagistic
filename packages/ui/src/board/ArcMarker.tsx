import type {SVGProps} from 'react';

/** Script presence uses a circle; an indirect consequence uses an outlined diamond. */
export const ArcMarker = ({
    x,
    y,
    radius,
    evidence,
    ...props
}: Omit<SVGProps<SVGElement>, 'ref'> & {
    x: number,
    y: number,
    radius: number,
    evidence: boolean,
}) => evidence ? (
    <circle {...props} cx={x} cy={y} r={radius} />
) : (
    <rect {...props} x={x - radius} y={y - radius} width={radius * 2} height={radius * 2} transform={`rotate(45 ${x} ${y})`} />
);
