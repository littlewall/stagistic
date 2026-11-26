---
title: What the Mac app sends
description: The two network requests the Mac app makes and what stays on your Mac.
---

Your scripts stay on your Mac. The Mac app makes two kinds of requests and sends nothing from your scripts, titles or attachments.

| Request | Goes to | Why |
| --- | --- | --- |
| Update check | GitHub (`github.com/littlewall/stagistic`, the `latest.json` file of the latest Release) | To find out whether a new Release exists, and to download it |
| Notice check | `stagistic.com/desktop/notice.json` | To read the [Manual update notice](/mac-app/updates/#if-the-app-cannot-update-itself), a small file that can ask you to install the current Release by hand |

Both are plain file downloads. Like any web request, they carry the usual technical details that make the download possible. Stagistic does not store or analyse them.

Both run after the app starts and again every few hours while it is open. A notice file is compared with your Release number on your Mac. Neither request is sent while you are offline.

## What is not sent

- Script text, titles, characters, attachments or backups.
- Anything you type, read or export.
- Your log files. They stay on your Mac unless you send one yourself.
- Usage analytics or crash reports. The app has none.

When you open links such as Help or the changelog, your default browser opens that page. That is an ordinary visit to the website.

If you connect an AI app with [MCP](/mac-app/claude-mcp/), the text it reads goes to that app, not to Stagistic.

The app has no setting to turn the checks off. A privacy page on stagistic.com is planned.
