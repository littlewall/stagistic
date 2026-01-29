import { useEffect, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import Editor from './routes/editor';
import './App.css';

function App() {
    const [health, setHealth] = useState<string>('Checking...');

    useEffect(() => {
        fetch('/api/health')
            .then((res) => res.json())
            .then((data) => setHealth(data.status))
            .catch(() => setHealth('API unavailable'));
    }, []);

    return (
        <div className="app-shell">
            <nav className="app-nav">
                <div className="app-brand">
                    <span className="app-brand-icon">🎭</span>
                    <span>Stagistic</span>
                </div>
                <div className="app-links">
                    <NavLink to="/" end>
                        Home
                    </NavLink>
                    <NavLink to="/editor">Editor</NavLink>
                </div>
            </nav>
            <main className="app-content">
                <Routes>
                    <Route
                        path="/"
                        element={
                            <section className="home">
                                <header className="home-hero">
                                    <h1>Cloud Editor for Theatre and Musical Scripts</h1>
                                    <p>Bootstrap workspace for the upcoming editor experience.</p>
                                </header>
                                <div className="home-card">
                                    <p>
                                        API Status: <strong>{health}</strong>
                                    </p>
                                </div>
                                <div className="home-details">
                                    <p>This is a placeholder application.</p>
                                    <p>The real editor will be built here.</p>
                                </div>
                            </section>
                        }
                    />
                    <Route path="/editor" element={<Editor />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;
