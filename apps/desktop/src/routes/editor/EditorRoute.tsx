import { useEffect, useState } from 'react';
import { Editor } from '../../editor/Editor';
import { loadLocalDb } from '../../db';

export const EditorRoute = () => {
    const [dbStatus, setDbStatus] = useState('initializing');

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                await loadLocalDb();
                if (mounted) {
                    setDbStatus('ready');
                }
            } catch (error) {
                console.error('Failed to initialize local database', error);
                if (mounted) {
                    setDbStatus('error');
                }
            }
        };

        void init();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <section>
            <h1>Stagistic Desktop (Offline Beta)</h1>
            <p>Local DB status: {dbStatus}</p>
            <Editor />
        </section>
    );
};
