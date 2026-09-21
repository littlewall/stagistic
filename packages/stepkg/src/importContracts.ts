export type StepkgImportStage = 'read' | 'manifest' | 'checksum' | 'schema' | 'validation' | 'assets' | 'write';

export type StepkgImportIssueCode =
    | 'not_a_zip'
    | 'manifest_invalid'
    | 'unsupported_format_version'
    | 'unsupported_document_schema_version'
    | 'file_missing'
    | 'checksum_mismatch'
    | 'schema_invalid'
    | 'broken_reference'
    | 'asset_missing'
    | 'write_failed';

export interface StepkgImportIssue {
    code: StepkgImportIssueCode;
    stage: StepkgImportStage;
    path?: string;
    entity?: {type: 'script' | 'character' | 'music' | 'scene' | 'attachment'; id: string; label?: string};
    details?: Record<string, string | number>;
}
