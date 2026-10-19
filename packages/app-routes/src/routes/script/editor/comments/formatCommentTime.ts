const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact age for the narrow comments panel: "now", "5m ago", "2h ago", "3d ago", then a date. */
export const formatCommentTime = (timestamp: number, now = Date.now()): string => {
    const diff = Math.max(now - timestamp, 0);

    if (diff < MINUTE) {
        return 'now';
    }

    if (diff < HOUR) {
        return `${Math.floor(diff / MINUTE)}m ago`;
    }

    if (diff < DAY) {
        return `${Math.floor(diff / HOUR)}h ago`;
    }

    if (diff < 7 * DAY) {
        return `${Math.floor(diff / DAY)}d ago`;
    }

    const date = new Date(timestamp);

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric',
    }).format(date);
};
