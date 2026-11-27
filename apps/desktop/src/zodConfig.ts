import {config} from 'zod';

/*
 * Zod probes `new Function` once to decide whether it may compile schemas. The
 * Mac app's Content Security Policy forbids it, so the probe only produces a
 * CSP violation report. Imported first in main.tsx, before any schema runs.
 */
config({jitless: true});
