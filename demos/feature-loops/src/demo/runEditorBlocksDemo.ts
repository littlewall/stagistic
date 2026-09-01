type RunEditorBlocksDemoArgs = {
    seedScript: () => Promise<string>,
    navigate: (path: string) => void,
};

export const runEditorBlocksDemo = async ({
    seedScript,
    navigate,
}: RunEditorBlocksDemoArgs): Promise<string> => {
    const scriptId = await seedScript();

    navigate(`/script/${scriptId}/editor`);

    return scriptId;
};
