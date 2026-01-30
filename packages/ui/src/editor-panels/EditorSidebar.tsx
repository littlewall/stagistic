import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Clock, List, Notes } from 'iconoir-react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import styles from './EditorSidebar.module.css';

export type Scene = {
  id: string;
  heading: string;
  lineNumber: number;
};

type EditorSidebarProps = {
  scenes: Scene[];
  onSceneClick: (lineNumber: number) => void;
  className?: string;
};

export function EditorSidebar({ scenes, onSceneClick, className }: EditorSidebarProps) {
  const [notes, setNotes] = useState('');
  const [selectedKey, setSelectedKey] = useState('scenes');

  const history = useMemo(
    () => [
      { id: '1', time: '2 min ago', action: 'Edited Scene 3' },
      { id: '2', time: '15 min ago', action: 'Added new dialogue' },
      { id: '3', time: '1 hour ago', action: 'Created project' },
    ],
    []
  );

  return (
    <aside className={clsx(styles.sidebar, className)}>
      <Tabs
        className={styles.tabs}
        selectedKey={selectedKey}
        onSelectionChange={(key) => setSelectedKey(String(key))}
      >
        <TabList className={styles.tabList}>
          <Tab id="scenes" className={styles.tab}>
            <List className={styles.tabIcon} aria-hidden="true" />
            Scenes
          </Tab>
          <Tab id="notes" className={styles.tab}>
            <Notes className={styles.tabIcon} aria-hidden="true" />
            Notes
          </Tab>
          <Tab id="history" className={styles.tab}>
            <Clock className={styles.tabIcon} aria-hidden="true" />
            History
          </Tab>
        </TabList>

        <TabPanel id="scenes" className={styles.tabPanel}>
          {scenes.length === 0 ? (
            <p className={styles.emptyState}>
              No scenes yet. Start with a scene heading like:
              <code className={styles.inlineCode}>INT. LOCATION - DAY</code>
            </p>
          ) : (
            <ul className={styles.sceneList}>
              {scenes.map((scene, index) => (
                <li key={scene.id}>
                  <button
                    type="button"
                    className={styles.sceneButton}
                    onClick={() => onSceneClick(scene.lineNumber)}
                  >
                    <span className={styles.sceneIndex}>{index + 1}.</span>
                    <span className={styles.sceneHeading}>{scene.heading}</span>
                    <span className={styles.sceneChevron} aria-hidden="true">
                      {'>'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TabPanel>

        <TabPanel id="notes" className={styles.tabPanel}>
          <textarea
            className={styles.notesArea}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add notes about your script..."
          />
        </TabPanel>

        <TabPanel id="history" className={styles.tabPanel}>
          <ul className={styles.historyList}>
            {history.map((item) => (
              <li key={item.id} className={styles.historyItem}>
                <p className={styles.historyAction}>{item.action}</p>
                <p className={styles.historyTime}>{item.time}</p>
              </li>
            ))}
          </ul>
        </TabPanel>
      </Tabs>
    </aside>
  );
}
