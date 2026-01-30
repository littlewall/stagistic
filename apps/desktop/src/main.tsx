import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@stagistic/ui/styles/base.css';
import './index.css';

if (navigator.userAgent.includes('Mac')) {
    document.body.classList.add('platform-macos');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
