import {useEffect, useState} from 'react';

/** Native modal dialogs cover and inert everything outside their top layer. */
export const useToastContainer = () => {
    const [container, setContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const update = () => {
            const focusedDialog = document.activeElement?.closest<HTMLDialogElement>('dialog:modal');
            const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog:modal');

            setContainer(focusedDialog ?? dialogs.item(dialogs.length - 1) ?? document.body);
        };
        const observer = new MutationObserver(update);

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['open'],
            childList: true,
            subtree: true,
        });
        update();

        return () => observer.disconnect();
    }, []);

    return container;
};
