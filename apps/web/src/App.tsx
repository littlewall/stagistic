import './App.css';

import {useEffect, useState} from 'react';

function App() {
    const [health, setHealth] = useState<string>('Checking...');

    useEffect(() => {
        fetch('/api/health')
            .then(res => res.json())
            .then(data => setHealth(data.status))
            .catch(() => setHealth('API unavailable'));
    }, []);

    return (
        <>
            {health}
        </>
    );
}

export default App;
