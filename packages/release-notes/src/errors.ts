/** A fragment, Release file or Release number that does not follow the format. */
export class ReleaseNotesError extends Error {
    readonly issues: string[];

    constructor(message: string, issues: string[] = [message]) {
        super(message);
        this.name = 'ReleaseNotesError';
        this.issues = issues;
    }
}
