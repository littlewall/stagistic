import {type MarkdownInline, parseMarkdown} from '@stagistic/shared';

const renderInline = (inline: MarkdownInline, index: number) => {
    switch (inline.kind) {
        case 'strong':
            return <strong key={index}>{inline.text}</strong>;
        case 'emphasis':
            return <em key={index}>{inline.text}</em>;
        case 'code':
            return <code key={index}>{inline.text}</code>;
        case 'link':
            return (
                <a
                    key={index}
                    href={inline.href}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    {inline.text}
                </a>
            );
        default:
            return inline.text;
    }
};

/** Renders Release Note Markdown through React elements only; see `parseMarkdown` in `@stagistic/shared` for the subset. */
export const SafeMarkdown = ({source}: {source: string}) => (
    <>
        {parseMarkdown(source).map((block, blockIndex) => (block.kind === 'list'
            ? (
                <ul key={blockIndex}>
                    {block.items.map((item, itemIndex) => <li key={itemIndex}>{item.map(renderInline)}</li>)}
                </ul>
            )
            : <p key={blockIndex}>{block.inlines.map(renderInline)}</p>))}
    </>
);
