import type { ReactNode } from 'react';

type EditorLayoutProps = {
    header?: ReactNode;
    sidebar?: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
};

export function EditorLayout({ header, sidebar, footer, children }: EditorLayoutProps) {
    return (
        <div className="editor-layout">
            {header && <header className="editor-header">{header}</header>}
            <div className="editor-body">
                <div className="editor-main">{children}</div>
                {sidebar && <aside className="editor-aside">{sidebar}</aside>}
            </div>
            {footer && <footer className="editor-footer-shell">{footer}</footer>}
        </div>
    );
}
