import '@stagistic/ui/styles/base.css';
import './index.css';

import {requireValue} from '@stagistic/shared';
import {bootstrapAppTheme} from '@stagistic/ui';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';

import App from './App';

bootstrapAppTheme();

ReactDOM.createRoot(requireValue(document.getElementById('root'))).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
);
