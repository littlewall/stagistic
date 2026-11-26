import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    getSaveWording,
    SaveFileProvider,
    saveFileWithAnchor,
    useSaveFile,
    useSaveWording,
} from './saveFile';

const roots: Root[] = [];

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

const Probe = () => {
    const saveFile = useSaveFile();

    return <button type="button" onClick={() => void saveFile({data: new Blob(['x']), suggestedName: 'a.pdf'})}>go</button>;
};

const mount = (element: React.ReactElement) => {
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);

    roots.push(root);
    root.render(element);

    return container;
};

describe('save file port', () => {
    it('web saver clicks a download anchor with the suggested name', async () => {
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

        const names: string[] = [];

        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
            names.push(this.download);
        });

        await saveFileWithAnchor({data: new Blob(['x']), suggestedName: 'Play.stagistic'});

        expect(names).toEqual(['Play.stagistic']);
    });

    it('uses the saver from the provider', async () => {
        const saveFile = vi.fn().mockResolvedValue(undefined);
        const container = mount(<SaveFileProvider saveFile={saveFile}><Probe /></SaveFileProvider>);

        await vi.waitFor(() => expect(container.querySelector('button')).not.toBeNull());
        container.querySelector('button')?.click();

        expect(saveFile).toHaveBeenCalledWith(expect.objectContaining({suggestedName: 'a.pdf'}));
    });

    it('words file actions per Surface', () => {
        const web = getSaveWording('Download');
        const mac = getSaveWording('Save');

        expect([
            web.pdfButton,
            web.stateMenuItem('draft'),
            web.stateSubmit('version'),
            web.backupButton,
        ]).toEqual([
            'Download PDF',
            'Save as draft and download…',
            'Save version and download',
            'Download backup',
        ]);
        expect([
            mac.pdfButton,
            mac.stateMenuItem('draft'),
            mac.stateSubmit('version'),
            mac.backupButton,
            mac.pdfMoreOptions,
        ]).toEqual([
            'Save PDF',
            'Save draft and PDF…',
            'Save version and PDF',
            'Save backup',
            'More save options',
        ]);
    });

    it('provides the verb to consumers, Download by default', async () => {
        const Wording = () => <span>{useSaveWording().pdfButton}</span>;
        const web = mount(<Wording />);
        const mac = mount(<SaveFileProvider saveFile={vi.fn()} verb="Save"><Wording /></SaveFileProvider>);

        await vi.waitFor(() => expect(mac.textContent).toBe('Save PDF'));
        expect(web.textContent).toBe('Download PDF');
    });
});
