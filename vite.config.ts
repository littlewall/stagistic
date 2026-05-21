import {defineConfig} from 'vite-plus';

import fmtConfig from './vite.config.fmt.ts';
import lintConfig from './vite.config.oxlint.ts';

export default defineConfig({
    lint: lintConfig,
    fmt: fmtConfig,
});
