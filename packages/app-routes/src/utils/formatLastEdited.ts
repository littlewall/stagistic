export const formatLastEdited = (timestamp: number): string => {
    const now = new Date();
    const updated = new Date(timestamp);
    const diffMs = now.getTime() - updated.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
        return 'Edited today';
    }

    if (diffDays === 1) {
        return 'Edited yesterday';
    }

    if (diffDays < 7) {
        return `Edited ${diffDays} days ago`;
    }

    const dateFormat = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: updated.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    });

    return `Edited ${dateFormat.format(updated)}`;
};
