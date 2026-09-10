export type Rgb = readonly [number, number, number];

export const getRgb = (color: string): Rgb => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas context is unavailable');
    }

    canvas.width = 1;
    canvas.height = 1;
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);

    const data = context.getImageData(0, 0, 1, 1).data;

    return [
        data[0],
        data[1],
        data[2],
    ];
};

const getRelativeLuminance = (color: string) => {
    const channels = getRgb(color).map(channel => {
        const value = channel / 255;

        return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
    });
    const [
        red,
        green,
        blue,
    ] = channels;

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

export const getContrastRatio = (foreground: string, background: string) => {
    const foregroundLuminance = getRelativeLuminance(foreground);
    const backgroundLuminance = getRelativeLuminance(background);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);

    return (lighter + 0.05) / (darker + 0.05);
};

export const readTokenColor = (name: string) => {
    const probe = document.createElement('div');

    probe.style.color = `var(${name})`;
    document.body.appendChild(probe);

    const color = getComputedStyle(probe).color;

    probe.remove();

    return color;
};
