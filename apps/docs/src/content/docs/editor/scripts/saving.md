---
title: Understand saving and storage
description: Know where the Web app and the Mac app keep your work and what the save indicator means.
---

Stagistic saves your changes automatically on this device.

| Surface | Where your scripts are |
| --- | --- |
| Web app | This browser's storage. Return to the same site and browser profile to find your scripts on the home screen. |
| [Mac app](/mac-app/) | On this Mac, in the app's own storage. It also writes [backups](/mac-app/backups/) you can find in Finder. |

## Check the save indicator

The status dot in the app header describes saving. Hover over it or focus it from the keyboard to see its label.

| State | Meaning |
| --- | --- |
| Saving… | A save is still in progress. |
| Saved | The save finished successfully. |
| Couldn’t save | A save failed. The latest changes may still need to be saved. |

Saving… appears when a save takes longer. Saved is shown briefly, then the indicator becomes idle. You will not see it continuously after a successful save.

## Close the editor and return later

In the Web app, let saving finish before closing the tab or browser. Later, open the same editor site in the same browser profile and choose the script from the home screen.

In the Mac app, closing the window or pressing <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>Q</kbd> waits until your latest changes are saved, then takes a backup and quits. If saving fails, the app asks whether to cancel or quit anyway.

Saved refers to the local save. To keep a separate file you can store outside the browser, [download a script file](/editor/scripts/download/).

## Keep a draft before revising

Automatic saving updates **Current** as you work. To keep the writing at a point you can revisit, use **Save as new draft** or **Save as version** in the state menu beside the script title. You keep writing in Current after saving it.

See [Save drafts and versions](/editor/scripts/drafts-and-versions/) for viewing, restoring and exporting saved states. These states live in the same local storage as the script; download packages for a backup outside the app.

## Use another browser, app or device

A different browser, browser profile, device or app has its own local library. The Web app and the Mac app do not share scripts; see [Move scripts from the Web app](/mac-app/move-from-web-app/). Download a `.stepkg` package, transfer the file, then [import it](/editor/scripts/import/) into the other library.

The file is a snapshot from when you downloaded it. Changes you make afterward remain in the library where you made them until you transfer another file.

In the Web app, clearing this site's browser data can remove locally stored scripts. Keep downloaded packages for work you want to preserve independently of browser storage. The Mac app's storage is not affected by clearing a browser's data.

## What if saving fails?

Keep the editor open while you preserve the current writing. If the download menu is available, use **Script (`.stagistic`)** to download (in the Mac app, save) the text currently in the editor. See [Download a script file](/editor/scripts/download/#keep-a-text-format-copy).

This captures writing in the text format, rather than all metadata and attachments. A `.stepkg` download first saves pending editor changes and can fail if that save fails. A failed download does not confirm that a backup was created; check that the file reached your downloads.

## Related tasks

- [Download a package with metadata and attachments](/editor/scripts/download/#download-a-package-for-backup-or-transfer).
- [Restore a package or keep an imported copy separate](/editor/scripts/import/).
