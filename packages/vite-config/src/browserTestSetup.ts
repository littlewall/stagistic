/// <reference lib="dom" />

import {beforeEach} from 'vite-plus/test';

/*
 * Vitest runs each test file in an iframe that does not own document focus, so
 * focus events and deferred focus (e.g. tiptap `autofocus`) race the test.
 */
beforeEach(() => {
    window.focus();
});
