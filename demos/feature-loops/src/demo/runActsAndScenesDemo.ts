type RunActsAndScenesDemoArgs = {
    seedScript: () => Promise<string>,
    navigate: (path: string) => void,
};

export const runActsAndScenesDemo = async ({
    seedScript,
    navigate,
}: RunActsAndScenesDemoArgs): Promise<string> => {
    const scriptId = await seedScript();

    navigate(`/script/${scriptId}/editor`);

    return scriptId;
};
