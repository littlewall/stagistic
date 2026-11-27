---
title: Backups and recovery
description: When the Mac app takes backups, where they are and what to do if an update fails.
---

The Mac app copies your scripts to backup files without you doing anything. Backups are a safety net; they are not a replacement for saving a `.stepkg` file of a script you want to keep elsewhere.

## When backups happen

A backup is written only when your scripts changed since the last one. If you leave the app open and do not write, no new backups appear.

| Backup | When | How many are kept |
| --- | --- | --- |
| Recent | About every 15 minutes while the app is open and something changed | The newest 4 |
| On quit | When you quit or close the window, after saving, if something changed | Counts as a recent backup |
| Daily | Not a separate backup: the newest backup of each of the 3 days before today is kept | 3, one per day |
| Before an update changes your data | At start, when a new Release has to change how scripts are stored | Every one from the last 14 days, and always the newest, kept separately |

That is normally at most 8 files; after an update that fixes a previous one there may briefly be up to 10. Older ones are deleted automatically. The last kind is named `stagistic-premigration-…`; it appears as **Before update** in the list below.

Backup files hold your script data and end in `.pgdata.gz`. Attachments are not copied into them; they stay in the `attachments` folder next to `backups`. See [Where your data lives](/mac-app/where-data-lives/).

## Find your backups

- **Help ▸ Show Backups Folder** opens the folder in Finder.
- **Settings ▸ Storage** lists your backups, newest first, with the folder path and a **Show Backups Folder** button.

## Restore a backup

Restoring returns **all** your scripts to the state of one backup. It is not possible to restore a single script.

1. Open **Settings** (<kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>,</kbd>) and choose **Storage**.
2. Find the backup by its date and time and choose **Restore…**.
3. Read the message and choose **Restore**. The app saves your latest changes, writes a backup of the current state first, replaces your scripts with the backup and restarts.

To undo a restore, restore the backup the app wrote just before it: it is the newest backup not marked **Before update**.

**Attachments are not restored.** Backups do not contain attachments. Attachments you deleted since the backup was taken do not come back; attachments you added since then stay in the `attachments` folder.

If the backup cannot be restored (the file is damaged or was made by a newer version), the app tells you and keeps your current scripts.

## Restore on a new Mac

The backups folder lives on your Mac, so it goes with the Mac. To be ready for a broken or replaced Mac, keep a copy of a backup file somewhere else: Time Machine already includes the backups folder, or copy a file to iCloud Drive, another cloud folder or a USB drive from time to time.

On the new Mac, install Stagistic, open **Settings ▸ Storage**, choose **Restore from File…** and pick the `.pgdata.gz` file. The rest works as above. Copy the `attachments` folder over yourself if you need your attachments.

## If an update fails

Your scripts are not deleted when an update fails. Follow these steps in order:

1. Read the screen. **Stagistic could not update your scripts** means a new Release could not change the stored scripts. They are still on your Mac, and a copy from before the update may be in the backups folder.
2. Open **Settings ▸ Storage** if the app starts, or choose **Show Backups Folder** on the screen. Leave the files where they are.
3. Quit Stagistic completely (<kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>Q</kbd>) and open it again. Restarting may help.
4. If it still fails, download the current Release from [stagistic.com/download](https://stagistic.com/download) and install it over the old app. Your scripts stay, because they are stored outside the app and the app identifier has not changed.
5. If the screen persists, report it at [feedback.stagistic.com](https://feedback.stagistic.com) with the text under **Technical details**.
6. Once the app starts again and your scripts look wrong, restore the **Before update** backup as described above.

## Other start-up screens

- **Your scripts need a newer Release of Stagistic**: you opened an older app than the one that last used your scripts. Choose **Open download page**, install the current Release and open it. Nothing has been changed.
- **An older version of Stagistic is running**: another copy of an older Release still holds your scripts. Quit Stagistic completely and open it again.
- **Stagistic could not start**: restart Stagistic. If it keeps happening, report it as above.

## Quit with ⌘Q

Closing the window or pressing <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>Q</kbd> waits until your latest changes are saved and a backup is written when something changed. A short "Saving your changes" screen may show. If saving fails, the app says **Your latest changes could not be saved** and lets you cancel or quit anyway.

Quitting from the Dock or shutting down the Mac with the app open skips this final step. Autosave still runs while you write, but quit with <kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>Q</kbd> first when you have just typed.
