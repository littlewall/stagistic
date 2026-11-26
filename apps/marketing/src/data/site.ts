/** Links and facts shared by several pages, so the copy and the redirect rules cannot drift apart. */

export const WEB_APP_URL = 'https://editor.stagistic.app';
export const DOCS_URL = 'https://docs.stagistic.com';
export const FEEDBACK_URL = 'https://feedback.stagistic.com';
export const GITHUB_URL = 'https://github.com/littlewall/stagistic';

/** Stable path on this site; `public/_redirects` sends it to the latest Release's DMG. */
export const MAC_DOWNLOAD_PATH = '/download/mac';
export const DOWNLOAD_PATH = '/download';

export const MAC_REQUIREMENTS = 'Apple silicon · macOS 15 or later';

/** The version-less DMG name from `apps/desktop/scripts/release/lib.ts` (`ASSET_NAMES.dmg`). */
export const MAC_DMG_URL = `${GITHUB_URL}/releases/latest/download/Stagistic-Editor-mac-arm64.dmg`;
