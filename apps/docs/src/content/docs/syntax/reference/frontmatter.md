---
title: Frontmatter
description: Supported YAML metadata fields, their types and the reference writer's output.
---

Frontmatter is optional and appears at the very start of the file. Both fences must be lines containing exactly `---`; an initial Unicode BOM is allowed before the opening fence.

```text
---
title: When Night Falls
subtitle: A musical in two acts
credits:
  - credit: Book
    authors:
      - Jane Smith
  - credit: Music
    authors:
      - Peter Gray
source: Based on the novel by Sam Gray
draftDate: 2026-07-01
contact: jane@example.com
copyright: © 2026 Jane Smith
---

# Act One

## A garden. Dusk.
```

The YAML document must be an object, empty or null. A list or a non-null scalar as the whole frontmatter is rejected. Opening frontmatter without a closing fence is an error.

## Supported fields

| Field | Type | Meaning |
| --- | --- | --- |
| `title` | String | Script title |
| `subtitle` | String | Subtitle |
| `credits` | List of credit objects | Contributions and authors |
| `source` | String | Source or adaptation information |
| `draftDate` | String shaped as `YYYY-MM-DD` | Fixed draft date |
| `contact` | String | Contact details |
| `copyright` | String | Copyright text |

All fields are optional. Missing, null or empty-string scalar fields are treated as absent; other non-string scalar values are rejected. Quote values that YAML would otherwise interpret as a number or boolean.

Unknown top-level keys are rejected. There are no supported `version`, `settings`, `dateFormat` or attachment fields here.

## Credits

Each credit object contains only:

- `credit`: a nonempty string, such as `Book` or `Music`;
- `authors`: a nonempty list of nonempty strings.

Whitespace-only credit and author strings are invalid. Unknown keys inside a credit object are rejected. An empty credits list is accepted; null or missing credits are treated as absent. Other non-list values are rejected.

## Dates

The reader checks the digit-and-hyphen shape of `draftDate`; it does not validate whether that date exists in the calendar. A supplied date becomes a fixed draft date.

The reference writer emits the fixed date for a manual draft-date setting. Otherwise it resolves the local date of export. Consequently, re-exporting a file without `draftDate` can add a date; the text format does not store an automatic-date mode.

YAML strings follow YAML quoting rules. These are separate from the restricted quoting rules for [names and music titles](/syntax/reference/text/#quoted-literals).

## Writer output

The reference writer emits supported fields in this order: title, subtitle, credits, source, draftDate, contact and copyright. Scalar text and credit/author strings are double-quoted using JSON-compatible escapes. The date is emitted in its ISO-shaped text form.

It trims supported scalar text, omits empty values and omits credit rows without a nonempty credit and at least one nonempty author. It still emits opening and closing fences even when there is little metadata.

For the body that follows the closing fence, see [File model and interpretation](/syntax/reference/).
