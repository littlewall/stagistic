/*
 * How a note's `docs`, `article` and `image` fields are read. One rule for the app dialog and the
 * marketing changelog, so a field means the same in both places.
 */

const isSitePath = (value: string): boolean => value.startsWith('/') && !value.startsWith('//');

/** A site path (`/guide/x`) joins the given site (no trailing slash); an `https://` address stays; anything else is dropped. */
export const resolveNoteLink = (value: string | undefined, site: string): string | undefined => {
    if (!value) {
        return undefined;
    }

    if (isSitePath(value)) {
        return `${site}${value}`;
    }

    return (/^https:\/\/\S+$/i).test(value) ? value : undefined;
};

/** Only an image served by the site itself (a file in its `public/` folder) is shown: no request leaves the site, and the app works offline. */
export const resolveNoteImage = (value: string | undefined): string | undefined => (value && isSitePath(value) ? value : undefined);
