import '@stagistic/ui/styles/base.css';
import './index.css';

import {bootstrapAppTheme} from '@stagistic/ui';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {HashRouter} from 'react-router-dom';

import App from './App';
import {applyPlatformClass} from './platform';

bootstrapAppTheme();
// Reserves the header's traffic-light space and enables its drag region on macOS.
applyPlatformClass();

// HashRouter keeps routing self-contained under Tauri's custom protocol, so deep
// links never depend on the host serving index.html for arbitrary paths.
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HashRouter>
            <App />
        </HashRouter>
    </React.StrictMode>,
);
