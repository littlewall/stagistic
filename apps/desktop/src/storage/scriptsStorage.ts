import type {Script} from '@stagistic/ui';

const STORAGE_KEY = 'stagistic.scripts';

const seedScripts: Script[] = [
    {id: '1', name: 'The Last Light'},
    {id: '2', name: 'Midnight Express'},
    {id: '3', name: 'Summer Solstice'},
    {id: '4', name: 'Winter\'s Tale'},
];

let memoryScripts = seedScripts;

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const createId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `script-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const loadScripts = (): Script[] => {
    if (!canUseStorage()) {
        return memoryScripts;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedScripts));

        return seedScripts;
    }

    try {
        const parsed = JSON.parse(raw) as Script[];

        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
    } catch (error) {
        console.warn('Failed to parse stored scripts', error);
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedScripts));

    return seedScripts;
};

export const saveScripts = (scripts: Script[]) => {
    if (!canUseStorage()) {
        memoryScripts = scripts;

        return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
};

export const createScript = (name: string): Script => {
    const trimmed = name.trim();
    const script: Script = {
        id: createId(),
        name: trimmed || 'Untitled script',
    };
    const scripts = loadScripts();
    const next = [script, ...scripts];

    saveScripts(next);

    return script;
};
