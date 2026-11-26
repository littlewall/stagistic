# Mac app distribution: frozen identifier, own update key, manual update notice

The Mac app keeps its scripts in WebKit storage and app data folders named after the bundle identifier `com.stagistic.editor`, under the webview origin of its Tauri custom protocol. Changing either makes existing scripts invisible to the new build, so the identifier never changes and every Tauri upgrade is tested by updating an installed build that holds real data.

Updates are signed with our own updater key, independent of Apple, and published as GitHub Releases with a `latest.json`. A lost key means installed apps can never update themselves again, so the key is kept in a password manager with an offline copy. As a fallback independent of that key and of GitHub, the app also reads a manual update notice from stagistic.com and can ask writers to install the current Release by hand; a build installed that way keeps the scripts because the identifier is unchanged.

## Consequences

- An emergency change to the notice file may go to `main` outside the Release flow.
- The Mac app supports Apple silicon and macOS 15 or later; older Macs use the Web app.
