/*
 * Structured data the .stagistic format cannot express. Keys match cues and
 * scene titles in example-script.stagistic; prepareExampleScriptDocument
 * rejects the template when they drift apart.
 */

export interface ExampleCharacter {
    key: string;
    colorHex: string;
    genderLabel: string;
    outline: string;
    voiceType: string;
    vocalRange: {low: string; high: string};
}

export interface ExampleGroup {
    key: string;
    colorHex: string;
    memberKeys: readonly string[];
}

export interface ExampleLocation {
    name: string;
    sceneTitles: readonly string[];
}

export interface ExampleCommentThread {
    /** Full text of the anchored block. */
    blockText: string;
    /** Range anchor inside the block; omitted for a whole-block comment. */
    quote?: string;
    messages: readonly string[];
    resolved?: boolean;
}

export const EXAMPLE_CHARACTERS: readonly ExampleCharacter[] = [
    {
        key: 'ELI',
        colorHex: '#8FB8DE',
        genderLabel: 'Male',
        outline: 'Mara’s practical friend and apprentice keeper. Trusts tools more than stories.',
        voiceType: 'baritone',
        vocalRange: {low: 'A2', high: 'F4'},
    },
    {
        key: 'MARA',
        colorHex: '#E9B949',
        genderLabel: 'Female',
        outline: 'The old keeper’s daughter. Believes the lamp still answers a song.',
        voiceType: 'mezzo-soprano',
        vocalRange: {low: 'A3', high: 'E5'},
    },
    {
        key: 'ROOK',
        colorHex: '#B89ACF',
        genderLabel: 'Male',
        outline: 'Captain of the fishing boat Kittiwake. Gruff, grateful, loud.',
        voiceType: 'bass-baritone',
        vocalRange: {low: 'G2', high: 'E4'},
    },
    {
        key: 'TAM',
        colorHex: '#E59A8C',
        genderLabel: 'Female',
        outline: 'Youngest of the crew and the first to see the light.',
        voiceType: 'soprano',
        vocalRange: {low: 'C4', high: 'A5'},
    },
];

export const EXAMPLE_GROUPS: readonly ExampleGroup[] = [{key: 'CREW', colorHex: '#9AA7B8', memberKeys: ['ROOK', 'TAM']}];

export const EXAMPLE_MUSIC_KINDS: Readonly<Record<string, 'song' | 'instrumental'>> = {
    'One Small Light': 'song',
    Thunderclap: 'instrumental',
    'Storm Underscore': 'instrumental',
    'One Small Light (Reprise)': 'song',
};

/** Title of the song that receives the integrated score PDF. */
export const EXAMPLE_SCORED_MUSIC_TITLE = 'One Small Light';

export const EXAMPLE_LOCATIONS: readonly ExampleLocation[] = [
    {name: 'Cliff Path', sceneTitles: ['Storm is coming']},
    {name: 'Lamp Room', sceneTitles: ['Inside the lighthouse', 'Broken window']},
    {name: 'Harbor', sceneTitles: ['After the storm']},
];

export const EXAMPLE_COMMENT_THREADS: readonly ExampleCommentThread[] = [
    {
        blockText: 'My father said this lamp once answered a song.',
        quote: 'answered a song',
        messages: ['This is the hook of the whole show. Can we hear the legend earlier?', 'Added a line about her father in the first scene. Enough?'],
    },
    {
        blockText: 'SHINE, SHINE,',
        messages: ['Music: hold “shine” for two full bars here, then drop to piano only.'],
        resolved: true,
    },
    {
        blockText: 'Close the window!',
        quote: 'Close the window',
        messages: ['Blocking: Eli must already be upstage by the window for this to land.'],
    },
];
