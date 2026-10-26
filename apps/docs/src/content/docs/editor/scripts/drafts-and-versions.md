---
title: Save drafts and versions
description: Keep numbered drafts and named versions, revisit their writing, restore a saved state or export it.
---

Before rewriting the final scene of `The last door`, save a draft. When you send the play to a festival, save a version named `Edinburgh Fringe 2026`. Both keep the script at that point while you continue writing in **Current**.

## Choose a draft or a version

| State | Use it for | Label |
| --- | --- | --- |
| Current | Your ongoing writing, saved automatically as you work. | Current |
| Draft | A point you want to return to before making more changes. | An automatic number, such as Draft #3, with an optional reason. |
| Version | The script used for a particular reading, festival or tour. | A required name and an optional note. |

Drafts and versions are saved when you choose to create them. Automatic saving updates Current; it does not create a history of drafts. Draft numbers increase within the script and are not reused after deletion.

## Save the current script

1. Open the state menu beside the script title in the app header. It shows **Current** when you are working on the current script.
2. Choose **Save as new draft** or **Save as version**.
3. For a draft, optionally enter a **Reason**, such as `new final monologue`. For a version, enter a **Name** and optionally a **Note**.
4. Choose **Save draft** or **Save version**.

You stay in Current. Later changes to the writing do not change the saved draft or version. The saved state includes the writing, structure, characters, music, comments, settings and title-page details.

## Revisit a saved state

Open the same state menu and select an entry under **Drafts** or **Versions**. The label in the header identifies the state you are viewing. Its structure, character, music and comment panels show the saved data.

The writing is read-only: you can read and copy text, but cannot rewrite it, rearrange scenes or change characters, music or comments. To continue editing that writing separately, [restore it as a new script](#continue-a-saved-state-as-a-separate-script).

You can adjust **Script settings**, including page layout and title-page details, while viewing a saved state. These changes are saved to that draft or version without changing Current. This lets you correct its printable presentation while keeping the writing fixed.

Select **Current** from the state menu to return to your ongoing writing. Opening a saved state does not restore it over Current.

## Manage drafts and versions

Choose **Manage drafts and versions** from the state menu. Use the **Drafts** and **Versions** tabs, then select an entry.

- Edit a draft's **Reason**, or a version's **Name** and **Note**, then choose **Save changes**.
- Choose **Open** to view the saved state.
- To turn a draft into a named version, choose **Mark as version**, enter a **Name**, then confirm with **Mark as version**. It moves to Versions and retains its origin, such as `from Draft #3`. A version cannot be changed back into a draft.
- Use the entry's delete action and confirm **Delete** to remove it permanently. Current stays unchanged.

## Restore a saved state to Current

1. Open the draft or version you want to return to.
2. Open the state menu and choose **Restore to this script**. You can also select the entry in Manage drafts and versions and choose **Restore**.
3. Review the confirmation, then choose **Restore**.

Before restoring, the editor saves Current as a new draft with a reason such as `Before restoring Draft #3`. After restoring, it opens Current with the restored writing.

| Restored from the saved state | Kept from Current |
| --- | --- |
| Text, acts, scenes and their details | Script title |
| Characters and groups | Script settings and title-page details |
| Music and its attachments | Other drafts and versions |

Comments follow the text. Current comment threads remain only where their anchors exist in the restored writing. Threads whose text is no longer present are removed from Current and remain in the draft saved before restoration. Comments already deleted from Current are not brought back from the saved state.

Restoring a draft differs from [replacing a script with an imported package](/editor/scripts/import/), which also replaces settings, title-page details and comments.

## Continue a saved state as a separate script

1. Open the saved state, then choose **Restore as new script** from its state menu or from Manage drafts and versions.
2. Enter a **Title**, such as `The last door — touring script`.
3. Choose **Create script**.

The editor opens a separate, editable script containing that saved state's writing and associated data, including its settings and title page. The original script stays unchanged. The new script has its own drafts and versions; the original history is not copied.

## Export a saved state

Select the draft or version first, then choose **Export** to [prepare its PDF](/editor/export/pdf/). The PDF filename includes its label, such as `The last door – Draft #3.pdf`.

The header's **Download script** menu also lets you download the selected state as a `.stepkg` package or `.stagistic` text file. A package contains the selected state, rather than the script's entire draft and version history.

To save Current at the moment you download a PDF, use **More download options** beside **Download PDF**. Choose **Save as draft and download…** or **Save as version and download…**, fill in the details and confirm. See [Save a draft or version with your PDF](/editor/export/pdf/#save-a-draft-or-version-with-your-pdf).

## Keep a copy outside the browser

In the web editor, drafts and versions live in the same local browser storage as the script. They do not provide a separate backup if that site's browser data is cleared. [Download packages](/editor/scripts/download/) of the states you need to preserve or transfer.

## Related tasks

- [Understand automatic saving and local storage](/editor/scripts/saving/).
- [Duplicate Current as a separate working copy](/editor/scripts/copies/).
- [Use Undo and Redo while writing](/editor/review/history/).
