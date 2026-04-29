import Document from '@tiptap/extension-document';

export const DocumentWithSettings = Document.extend({
    addAttributes() {
        return {
            settings: {
                default: null,
            },
            structure: {
                default: null,
            },
        };
    },
});
