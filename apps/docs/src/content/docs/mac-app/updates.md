---
title: Update the Mac app
description: How the Mac app finds and installs a new Release, how to check yourself and what to do if updating stops working.
---

The Mac app checks for a new Release shortly after it starts and every few hours while it is open. When one is available, it downloads in the background. The app never restarts by itself, so an update never interrupts your writing.

## Restart when you are ready

When a new Release is ready, the footer shows **Release 1.0.1 is ready. Restart** (with your Release's number). Choose it when it suits you.

The app saves your latest changes, takes a backup and then restarts into the new Release. If saving fails, it tells you and lets you cancel or restart anyway. If you do not restart, the app runs the new Release the next time you open it.

After an update, **What's new** shows the Highlights of that Release.

## Check for updates yourself

- Choose **Stagistic Editor ▸ Check for Updates…** in the menu bar. A dialog says whether you are up to date, a Release is ready (with **Restart** and **Later**) or the check failed.
- Open **Settings** (<kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>,</kbd>) and choose **About app**. It shows your Release with **What's new** and **Full changelog**, and under **Updates** the status and when the app last checked, with **Check now** or **Restart** when a Release is ready.

If a check fails, **Settings ▸ About app** shows **Couldn't check for updates** with **Try again**. A background check that fails stays quiet in the footer. Check your internet connection, then try again.

## If the app cannot update itself

If Stagistic can no longer update older Releases by itself, a thin bar appears below the app header, for example: "This Release can no longer update itself. Download the current Release." Choose **Download** to open [stagistic.com/download](https://stagistic.com/download), install the current Release by hand and open it. Choose **Hide** to hide the bar until the next start.

Installing by hand keeps your scripts, attachments and backups: they live outside the app. See [Backups and recovery](/mac-app/backups/).

## Your Release number

The footer shows the number of the Release you are running. The same number appears in **Stagistic Editor ▸ About Stagistic Editor** and under **Version** in **Settings ▸ About app**.

The app has no setting to turn update checks off. See [What the Mac app sends](/mac-app/what-it-sends/) for what a check sends.
