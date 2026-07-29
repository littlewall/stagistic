import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {resolveAnchoredMenuPlacement} from './anchoredMenuPlacement';

describe('resolveAnchoredMenuPlacement', () => {
    it('keeps a menu below when it fits there', () => {
        expect(resolveAnchoredMenuPlacement({
            anchorTop: 500,
            anchorBottom: 532,
            menuHeight: 200,
            viewportHeight: 800,
            viewportMargin: 8,
        })).toEqual({
            placement: 'below',
            maxHeight: 260,
        });
    });

    it('places a clipped menu above when that side has more room', () => {
        expect(resolveAnchoredMenuPlacement({
            anchorTop: 700,
            anchorBottom: 732,
            menuHeight: 200,
            viewportHeight: 800,
            viewportMargin: 8,
        })).toEqual({
            placement: 'above',
            maxHeight: 692,
        });
    });

    it('keeps an oversized menu on the preferred side when it has more room', () => {
        expect(resolveAnchoredMenuPlacement({
            anchorTop: 100,
            anchorBottom: 132,
            menuHeight: 900,
            viewportHeight: 300,
            viewportMargin: 8,
        })).toEqual({
            placement: 'below',
            maxHeight: 160,
        });
    });
});
