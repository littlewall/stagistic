---
title: Move scripts from the Web app
description: Bring a script from the Web app into the Mac app, one script at a time, with a .stepkg package.
---

The Web app and the Mac app keep separate libraries. The Web app stores scripts in your browser; the Mac app stores them on your Mac. Nothing moves between them by itself. Use a `.stepkg` package to bring each script over.

A package holds the script, its title page, settings, characters, music, comments and attachments. See [Download a script file](/editor/scripts/download/) for the full list.

## Move one script

In the Web app:

1. Open the script.
2. In the app header, choose **Download script**, then **Script & metadata (`.stepkg`)**.
3. Check that the file was downloaded.

In the Mac app:

1. On the script list, choose **Import script**, or **File ▸ Import…**.
2. Drop the `.stepkg` file into the dialog, or click the file area to choose it.
3. Review **Script name**, then choose **Import script**.

The script opens in the Mac app as a new script. Repeat for every script you want to move.

## Before you stop using the Web app

- Open each imported script in the Mac app and check that the text, characters and attachments are there.
- Keep the scripts in the Web app until you have checked. Importing does not change or remove them.
- The libraries do not sync. Changes you make later stay in the app where you made them. Export again to move a newer state.
- A package holds one state of the script. To keep a [saved draft or version](/editor/scripts/drafts-and-versions/), select it in the state menu beside the script title and download it separately.

## Moving back

The Mac app does the same in reverse. In the Mac app, **Script ▸ Save Script…** saves a `.stepkg` package (there is no format choice); import the file in the Web app. See [Import or restore a script](/editor/scripts/import/).
