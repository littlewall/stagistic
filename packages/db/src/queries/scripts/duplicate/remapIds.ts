/**
 * Remaps a nullable foreign key through an id map. Unknown ids fall back to null
 * (the referenced row was not copied), matching the `on delete set null` behavior.
 */
export const remapNullable = (map: ReadonlyMap<string, string>, id: string | null): string | null => id === null ? null : map.get(id) ?? null;

export const remapCharacterTagIds = (contentJson: string | null, entityIdMap: ReadonlyMap<string, string> | null): string | null => {
    if (contentJson === null) {
        return null;
    }

    const remapValue = (value: unknown): unknown => {
        if (Array.isArray(value)) {
            return value.map(remapValue);
        }

        if (typeof value !== 'object' || value === null) {
            return value;
        }

        const record = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, remapValue(child)]));

        if (record.type !== 'characterTag') {
            return record;
        }

        const attrs = typeof record.attrs === 'object' && record.attrs !== null ? (record.attrs as Record<string, unknown>) : {};
        const oldId = typeof attrs.characterId === 'string' ? attrs.characterId : null;

        return {
            ...record,
            attrs: {
                ...attrs,
                characterId: oldId === null ? null : entityIdMap?.get(oldId) ?? null,
            },
        };
    };

    try {
        return JSON.stringify(remapValue(JSON.parse(contentJson) as unknown));
    } catch {
        return contentJson;
    }
};
