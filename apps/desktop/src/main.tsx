// Must run before any module that parses with zod.
import './zodConfig';
import '@stagistic/ui/styles/base.css';
import './index.css';

import {requireValue} from '@stagistic/shared';
import {bootstrapAppTheme} from '@stagistic/ui';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {HashRouter} from 'react-router-dom';

import App from './App';
import {installExternalLinkHandler} from './links/externalLinks';
import {installFrontendErrorLog, sendToLog} from './logging/frontendLog';
import {applyPlatformClass} from './platform';

// Frontend errors reach the same log file as Rust errors.
installFrontendErrorLog({
    console,
    target: window,
    send: sendToLog,
});
bootstrapAppTheme();
// Reserves the header's traffic-light space and enables its drag region on macOS.
applyPlatformClass();
// Links to other sites open in the default browser, never inside the app window.
installExternalLinkHandler(document);

/*
 * HashRouter keeps routing self-contained under Tauri's custom protocol, so deep
 * links never depend on the host serving index.html for arbitrary paths.
 */
ReactDOM.createRoot(requireValue(document.getElementById('root'))).render(
    <React.StrictMode>
        <HashRouter>
            <App />
        </HashRouter>
    </React.StrictMode>,
);
