import '@stagistic/ui/styles/base.css';
import './index.css';

import {isApplePlatform} from '@stagistic/platform-core';
import {bootstrapAppTheme} from '@stagistic/ui';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

bootstrapAppTheme();

if (isApplePlatform()) {
    document.body.classList.add('platform-macos');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
