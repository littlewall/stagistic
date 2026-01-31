import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from 'react-router-dom';

import {HomeRoute} from '~routes/home/HomeRoute';
import {ScriptEditorRoute} from '~routes/script/ScriptEditorRoute';
import {ScriptListRoute} from '~routes/script/ScriptListRoute';
import {ScriptSettingsRoute} from '~routes/script/ScriptSettingsRoute';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/script/list" element={<ScriptListRoute />} />
                <Route path="/script/:scriptId/editor" element={<ScriptEditorRoute />} />
                <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
