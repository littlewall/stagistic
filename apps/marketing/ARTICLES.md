# Articles

Articles are Markdown files in `src/content/articles/`. Astro validates their
frontmatter using `src/content.config.ts` and builds static pages.

## Add an article

1. Copy `src/content/articles/_template.md` to a descriptive, lowercase filename,
   e.g. `stage-play-formatting.md`.
2. Fill in the frontmatter and write the body in English. The layout supplies
   the H1, so start with prose and use `##` for sections.
3. Preview with `moon run marketing:dev`.
4. Set `draft: false` and a `publishDate` on or before the build date to publish.
5. Run `moon run marketing:typecheck` and `moon run marketing:build` before deploying.

The filename supplies the URL: `stage-play-formatting.md` becomes
`/articles/stage-play-formatting`. Nested folders become nested URL segments.
Link to other articles using their full path, without `.md`.

The shared article layout adds a footer linking to Stagistic Editor after every
article. Keep this footer out of individual Markdown files.

## Frontmatter

| Field | Required | Meaning |
| --- | --- | --- |
| `title` | Yes | Page title and article heading. |
| `description` | Yes | Summary used in the list and page metadata. |
| `publishDate` | Yes | Publication date in `YYYY-MM-DD` format. |
| `author` | No | Defaults to `Stagistic`. |
| `tags` | No | Topic labels; defaults to an empty list. |
| `draft` | No | Defaults to `true`; explicitly set `false` to publish. |

Drafts and future-dated articles are excluded from both `/articles` and detail
routes, including during local development. To preview an unpublished article,
temporarily use `draft: false` and a past or current date locally; restore its
draft status before sharing changes. Publication is checked at build time:
future dates need a new build to go live. Published articles are listed newest first.

The template stays a draft. Until the first article is published, `/articles`
shows an empty state with a link to the Stagistic Syntax introduction.

Initial briefs and editorial guidance:
[`docs/research/2026-10-13-blog-topics.md`](../../docs/research/2026-10-13-blog-topics.md).
