---
title: Import or restore a script
description: Bring in a script file, keep a new copy or restore an existing script from a package.
---

Use **Import script** on the home screen to bring a downloaded file into the library. The supported files are `.stagistic` and `.stepkg`.

## Import a file

1. Choose **Import script**.
2. Drop the file into the dialog, or click the file area to browse for it.
3. Review **Script name**. For a separate draft, enter `The last door — restored copy`.
4. Choose **Import script**.

The imported script opens in the editor. A `.stagistic` file creates a new script from its text; a `.stepkg` import also restores the associated package data.

If a package matches a script already in this library, the dialog offers an additional choice before importing.

## Keep an existing script and import another copy

When offered a choice, select **Import as new copy**. Set the new Script name, then choose **Import script**.

The existing script stays in the library. The imported copy contains the snapshot from the package, including its metadata and attachments. Later edits to either script are separate.

Use this when you want to inspect an earlier snapshot or try a restored draft alongside the current one.

## Replace an existing script from a package

1. Select **Replace existing**, checking the script title shown beside the choice.
2. Use **Download backup** to keep a package of the existing local script before replacing it. Check that the backup was downloaded.
3. Enter `replace me` in the confirmation field.
4. Choose **Replace script**.

The editor opens the restored script. The package replaces the existing script's data; it does not merge the package with changes made since that snapshot. Those later local changes are lost from the replaced script. The backup gives you a file you can import again if needed.

Use **Cancel** to leave the import without replacing anything.

## Why is replacement offered for this package?

A `.stepkg` package carries the identity of the script it came from. The app checks whether that script already exists locally. A matching name by itself does not trigger replacement.

Renaming the local script does not change that identity. Importing as a new copy creates a separate identity, even if you choose the same title.

Replacement is offered only when the matching script exists in this library. A `.stagistic` import creates a new script and does not offer this package replacement choice.

## If the file cannot be imported

Read the error message shown by the app. Check that you selected a `.stagistic` or `.stepkg` file. A package created with a newer unsupported document version may require updating the app before importing.

## Related tasks

- [Download the formats supported here](/editor/scripts/download/).
- [Make a working copy from the home screen](/editor/scripts/copies/).
