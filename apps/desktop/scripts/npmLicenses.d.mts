/** Production npm dependencies of a package, one notice per package (name@version (license) + license text). */
export declare const collectNpmLicenses: (packageDir: string) => Promise<string[]>;
