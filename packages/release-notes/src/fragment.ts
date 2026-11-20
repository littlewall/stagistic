import {
    fail,
    formatIssues,
    splitFrontMatter,
} from './frontmatter';
import type {ReleaseNoteFragment} from './schema';
import {releaseNoteFragmentSchema} from './schema';

/** Parses one `releases/next/*.md` file. `label` (usually the path) prefixes any error message. */
export const parseFragment = (source: string, label: string): ReleaseNoteFragment => {
    const {data, body} = splitFrontMatter(source, label);
    const result = releaseNoteFragmentSchema.safeParse(data);
    const issues = result.success ? [] : formatIssues(result.error);

    if (body === '') {
        issues.push('description: the text after the front matter is the description and cannot be empty');
    }

    if (!result.success || issues.length > 0) {
        return fail(label, issues);
    }

    return {...result.data, description: body};
};
