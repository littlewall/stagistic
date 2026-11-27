---
title: Where your data lives
description: Find your scripts, attachments, backups and log files on your Mac.
---

Everything stays on your Mac. The app has no account and no cloud storage. Your Mac's `Library` folder is hidden: in Finder, choose **Go ▸ Go to Folder…** (<kbd><span aria-hidden="true">⇧</span> Shift</kbd> + <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>G</kbd>) and paste a path from the table.

| What | Where |
| --- | --- |
| Scripts, drafts and versions | `~/Library/WebKit/com.stagistic.editor/WebsiteData/IndexedDB` |
| Attachments, such as score PDFs | `~/Library/Application Support/com.stagistic.editor/attachments` |
| Backups | `~/Library/Application Support/com.stagistic.editor/backups` |
| MCP helper for other AI apps | `~/Library/Application Support/com.stagistic.editor/mcp` |
| Log files | `~/Library/Logs/com.stagistic.editor/` |

## Scripts are not files

The app keeps scripts in its own database, in the first folder above. You cannot open a script from there in another app, and you should not move or edit those files. To get a script out as a file, [save a `.stepkg` or `.stagistic` file](/editor/scripts/download/). To keep a copy of everything, see [Backups and recovery](/mac-app/backups/).

## See the paths in the app

Open **Settings** (<kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>,</kbd>) and choose **Storage**. It shows where attachments and backups are, lists the backups newest first, and **Show Attachments Folder** and **Show Backups Folder** buttons. **Help ▸ Show Backups Folder** opens the same folder in Finder.

## Your data survives updates and reinstalling

Scripts, attachments and backups are stored outside the app, in folders named after its identifier, `com.stagistic.editor`. Updating, replacing the app with a newer download and deleting the app from Applications do not remove them. Only deleting those folders does. See [Uninstall the Mac app](/mac-app/uninstall/).

## Log files

The app writes a log to `~/Library/Logs/com.stagistic.editor/stagistic-editor.log`. It holds technical messages, not your script text. If you report a problem, the log helps us find the cause; attach it if you are comfortable doing so. The log stays on your Mac until you send it.
