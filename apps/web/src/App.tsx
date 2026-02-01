
import {
    HomeRoute,
    ScriptEditorRoute,
    ScriptListRoute,
    ScriptSettingsRoute,
} from '@stagistic/app-routes';
import {ToastProvider} from '@stagistic/ui';
import {
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

function App() {
    return (
        <ToastProvider>
            <Routes>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/script/list" element={<ScriptListRoute />} />
                <Route path="/script/:scriptId/editor" element={<ScriptEditorRoute />} />
                <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </ToastProvider>
    );
}

export default App;
