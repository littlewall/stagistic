type RunCharactersDemoArgs = {
    seedScript: () => Promise<string>,
    navigate: (path: string) => void,
};

export const runCharactersDemo = async ({
    seedScript,
    navigate,
}: RunCharactersDemoArgs): Promise<string> => {
    const scriptId = await seedScript();

    navigate(`/script/${scriptId}/editor`);

    return scriptId;
};
