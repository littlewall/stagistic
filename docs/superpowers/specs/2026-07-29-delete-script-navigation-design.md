# Delete-script navigation design

## Goal

After confirming deletion from editor settings, the user reaches the home route without briefly rendering another script editor.

## Root cause

`deleteScript()` removes the script optimistically. While its persistence promise is pending, `useEditorRedirects()` observes the missing current script and navigates to the most recent remaining script. The delete handler currently navigates home only after that promise resolves.

## Decision

Navigate to `/` with history replacement before invoking `deleteScript()`. The route leaves the editor before reactive deletion updates can trigger the editor fallback redirect. The existing delete promise, loading state, success toast, and error handling remain unchanged.

## Test

Add a browser-hook regression test with a deferred delete promise. It will assert that navigation to `/` occurs before deletion is allowed to resolve. Reversing that order recreates the faulty intermediate editor route.

## Scope

Only the editor-settings delete handler and its focused regression test change. No persistence, route redirect, toast, or database behavior changes.
