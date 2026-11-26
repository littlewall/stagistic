---
title: Uninstall the Mac app
description: Remove the Mac app and, if you want, the scripts, attachments, backups and logs it stored on your Mac.
---

Removing the app and removing your data are separate steps.

## Remove only the app

1. Quit Stagistic Editor (<kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>Q</kbd>).
2. Open **Applications** and drag **Stagistic Editor** to the Trash.

Your scripts, attachments and backups stay on your Mac. If you install the app again later, they are there.

## Remove the app and all its data

This deletes your scripts and backups for good. Before you start, [save a `.stepkg` package](/editor/scripts/download/) of every script you want to keep.

1. Quit the app and move it to the Trash as above.
2. In Finder, choose **Go ▸ Go to Folder…** (<kbd><span aria-hidden="true">⇧</span> Shift</kbd> + <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>G</kbd>).
3. Move these folders to the Trash:
   - `~/Library/WebKit/com.stagistic.editor`: your scripts.
   - `~/Library/Application Support/com.stagistic.editor`: attachments, backups and the MCP helper.
   - `~/Library/Logs/com.stagistic.editor`: log files.
   - `~/Library/Caches/com.stagistic.editor`: caches.
4. Empty the Trash.

If you connected an AI app with [MCP](/mac-app/claude-mcp/), also remove Stagistic from Claude's extensions and from other apps' MCP configuration.

See [Where your data lives](/mac-app/where-data-lives/) for what each folder holds.
