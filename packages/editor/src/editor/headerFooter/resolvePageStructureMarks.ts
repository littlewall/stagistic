export interface StructureBlockPos {
    pos: number,
    blockType: string | undefined,
}

export interface PageStartInfo {
    startPos: number,
}

export interface PageStructureMark {
    actIndex: number | null,
    sceneNumber: number,
}

export const resolvePageStructureMarks = (
    blocks: StructureBlockPos[],
    pages: PageStartInfo[],
): PageStructureMark[] => {
    const sorted = [...blocks].sort((a, b) => a.pos - b.pos);
    const running: {
        pos: number, actIndex: number, sceneNumber: number,
    }[] = [];
    let actIndex = 0;
    let sceneNumber = 0;

    for (const block of sorted) {
        if (block.blockType === 'act') {
            actIndex += 1;
        }

        if (block.blockType === 'scene') {
            sceneNumber += 1;
        }

        running.push({
            pos: block.pos, actIndex, sceneNumber,
        });
    }

    return pages.map(page => {
        let current = {actIndex: 0, sceneNumber: 0};

        for (const entry of running) {
            if (entry.pos <= page.startPos) {
                current = {actIndex: entry.actIndex, sceneNumber: entry.sceneNumber};
            } else {
                break;
            }
        }

        return {
            actIndex: current.actIndex > 0 ? current.actIndex : null,
            sceneNumber: current.sceneNumber,
        };
    });
};
