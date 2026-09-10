import {
    Panel, Stack, Text,
} from '@stagistic/ui';
import {useEffect, useState} from 'react';

import styles from './DevUiRoute.module.css';
import {controls} from './registry/controls';
import {primitives} from './registry/primitives';
import type {CatalogGroup} from './registry/types';

const GROUPS: CatalogGroup[] = [primitives, controls];

/*
 * The catalog's scale axis is the reader's root font size, which is what the
 * rem ladder responds to. `md` is the browser default; the other two are the
 * settings a low-vision reader actually reaches for.
 */
const SCALES = {
    sm: '14px', md: '16px', lg: '20px',
} as const;

type ScaleName = keyof typeof SCALES;

export const DevUiRoute = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [scale, setScale] = useState<ScaleName>('md');

    useEffect(() => {
        const root = document.documentElement;
        const previousTheme = root.getAttribute('data-theme');
        const previousScale = root.style.fontSize;

        root.setAttribute('data-theme', theme);
        root.style.fontSize = SCALES[scale];

        return () => {
            if (previousTheme === null) {
                root.removeAttribute('data-theme');
            } else {
                root.setAttribute('data-theme', previousTheme);
            }

            root.style.fontSize = previousScale;
        };
    }, [theme, scale]);

    return (
        <div className={styles.route}>
            <div className={styles.controls}>
                <Text variant="label" size="sm">Theme</Text>
                <button type="button" onClick={() => setTheme('light')}>light</button>
                <button type="button" onClick={() => setTheme('dark')}>dark</button>
                <Text variant="label" size="sm">Scale</Text>
                {(Object.keys(SCALES) as ScaleName[]).map(name => (
                    <button
                        key={name}
                        type="button"
                        onClick={() => setScale(name)}
                    >
                        {name}
                    </button>
                ))}
            </div>
            <Stack gap="2xl">
                {GROUPS.map(group => (
                    <Stack key={group.title} gap="lg">
                        <Text as="h2" size="3xl">{group.title}</Text>
                        {group.entries.map(entry => (
                            <Stack key={entry.name} gap="sm">
                                <Text as="h3" size="xl">{entry.name}</Text>
                                <Text
                                    variant="muted"
                                    size="xs"
                                    className={styles.contract}
                                >
                                    {entry.variables.join(' · ')}
                                </Text>
                                <div className={styles.grid}>
                                    {entry.samples.map(sample => (
                                        <Panel key={sample.label} padding="sm">
                                            <Stack gap="sm">
                                                <Text variant="muted" size="xs">
                                                    {sample.label}
                                                </Text>
                                                <div className={styles.sample}>
                                                    {sample.node}
                                                </div>
                                            </Stack>
                                        </Panel>
                                    ))}
                                </div>
                            </Stack>
                        ))}
                    </Stack>
                ))}
            </Stack>
        </div>
    );
};
