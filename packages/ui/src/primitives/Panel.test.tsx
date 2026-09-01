import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Panel} from './Panel';
import styles from './Panel.module.css';

describe('Panel', () => {
    it('defaults to the panel layer, bordered', () => {
        const markup = renderToStaticMarkup(<Panel>content</Panel>);

        expect(markup).toContain(styles.panel);
        expect(markup).toContain(styles.layerPanel);
        expect(markup).toContain(styles.bordered);
    });

    it('drops the border when asked', () => {
        const markup = renderToStaticMarkup(<Panel bordered={false}>x</Panel>);

        expect(markup).not.toContain(styles.bordered);
    });

    it('carries the float layer and a padding step', () => {
        const markup = renderToStaticMarkup(
            <Panel layer="float" padding="lg">x</Panel>,
        );

        expect(markup).toContain(styles.layerFloat);
        expect(markup).toContain(styles.padLg);
    });
});
