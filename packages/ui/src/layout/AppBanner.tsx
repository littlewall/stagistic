import {
    createContext,
    type ReactNode,
    useContext,
} from 'react';

const AppBannerContext = createContext<ReactNode>(null);

/*
 * A host (e.g. the Mac app) supplies one banner here; every AppLayout renders
 * it as a full-width row between the header and the page content.
 */
export const AppBannerProvider = ({banner, children}: {banner: ReactNode, children: ReactNode}) => (
    <AppBannerContext.Provider value={banner}>{children}</AppBannerContext.Provider>
);

export const useAppBanner = () => useContext(AppBannerContext);
