import { EditorRoute } from './routes/editor/EditorRoute';
import Toolbar from './components/Toolbar';

const App = () => {
    return (
        <div className="app">
            <header className="app__header">
                <div>
                    <h1>Stagistic Editor Playground</h1>
                    <p>Phase 1: line-based Fountain structure only.</p>
                </div>
                <Toolbar />
            </header>
            <main className="app__main">
                <EditorRoute />
            </main>
        </div>
    );
};

export default App;
