import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './AppLayout.module.css';

type AppLayoutProps = {
  header?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
};

export function AppLayout({ header, sidebar, children }: AppLayoutProps) {
  return (
    <div className={styles.page}>
      {header ? <div className={styles.header}>{header}</div> : null}
      <div className={styles.body}>
        <main className={styles.main}>{children}</main>
        {sidebar ? <aside className={clsx(styles.sidebar)}>{sidebar}</aside> : null}
      </div>
    </div>
  );
}
