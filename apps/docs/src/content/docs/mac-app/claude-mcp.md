---
title: Connect Claude with MCP
description: Let Claude or another AI app read your scripts on this Mac through a read-only connection.
---

MCP lets an AI app on your Mac read your saved scripts while Stagistic is open. Access is read-only: the AI app can look at your scripts but cannot change them. It is off until you turn it on.

Use it, for example, to ask Claude to find every scene a character appears in or to summarise a scene.

## What the AI app can do

- List your scripts and show a script's outline of acts and scenes.
- Read a scene or a passage, in Stagistic's text format.
- Look up characters and their dialogue.
- Search the text of your scripts.

Text an AI app reads becomes part of its conversation and is handled under that app's own terms. Stagistic does not send it anywhere itself.

## Connect Claude

You need the Claude desktop app.

1. In the Mac app, open **Settings** (<kbd><span aria-hidden="true">⌘</span> Command</kbd> + <kbd>,</kbd>) and choose **MCP**.
2. Under **Claude**, choose **Connect to Claude**. Stagistic turns the MCP server on and opens Claude.
3. Claude asks you to confirm the installation. Confirm it.

Keep Stagistic open while you use it from Claude. Closing the app closes the connection.

## Connect another AI app

Any app that starts local MCP servers can connect.

1. Open **Settings ▸ MCP**.
2. Under **Other apps**, choose **Show configuration**, then **Copy configuration**.
3. Paste it into the other app's MCP configuration. Apps that do not use the `mcpServers` format need only the command path.
4. Turn on **MCP server** in the same panel and keep Stagistic open.

## Turn it off

Turn off **MCP server** in **Settings ▸ MCP**. AI apps can then no longer read your scripts. To remove the connection completely, also remove Stagistic from Claude's extensions and from other apps' MCP configuration.

## After an update

The app refreshes the helper it prepared for other apps the first time it starts after a new Release, so the configuration you pasted keeps working. If an AI app reports a version mismatch, quit and reopen that app. Claude may need the connection reinstalled after a rare protocol change: choose **Connect to Claude** again.

The Web app does not offer MCP.
