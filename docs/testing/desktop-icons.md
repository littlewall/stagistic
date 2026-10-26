# Stagistic desktop and MCP icons

2026-10-20. macOS 26.5.2, full Xcode, existing `tauri` checkout. No commits.

## Design

The source geometry is the existing two-path Stagistic mark from
`apps/web/public/favicon.svg`, unchanged. Its warm graphite `#3d2a1d` matches
the favicon. The background is solid white, as requested. The Apple symbol occupies 68%
of a 1024 px square canvas, centered from the favicon's viewBox.

The macOS source is a real Icon Composer document:
[`Stagistic.icon`](../../apps/desktop/src-tauri/icons/Stagistic.icon/icon.json).
The SVG foreground contains only the mark. Background, glass material, lighting
and appearance colors are configured in Icon Composer; corner masking and
material rendering are supplied by Apple. The background stays white in both
default and dark appearances; only the mark has glass effects. The compiler
also emits a system-tintable rendition.
This follows Apple's guidance to supply vector foregrounds, keep effects out
of imported artwork, and let the system render masks and Liquid Glass.
[Apple app icon guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons),
[Icon Composer documentation](https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer).

MCP receives a separate **flat** 512×512 PNG rendered directly from the same
vector geometry: solid graphite on white, without highlights, shadows,
gradients or a rounded enclosure. It does not reuse Apple's glass export.
The MCP symbol fills 80% of its canvas width, leaving 10% margins on each side.
It has separate placement from the Apple icon: Claude supplies its own UI
spacing, so retaining the Apple composition's 68% symbol width added a second
margin and made the installed extension look too small. The change increases
the glyph's displayed width by about 18% within the same client-controlled slot.
PNG remains the supported MCPB format; no format change is needed.

## Integration

| Asset/configuration | Purpose |
| --- | --- |
| `src-tauri/icons/Stagistic.icon/` | Editable composition and generated vector layer. |
| `src-tauri/icons/Assets.car` | Apple-compiled image stacks, default/dark/tintable appearances and raster fallbacks. |
| `src-tauri/icons/icon.icns` | Apple's compiled legacy macOS icon, retained without resizing or modifying its layout. |
| `src-tauri/icons/icon.png` | Native 1024 px flattened preview/export. |
| `src-tauri/icons/{32x32,64x64,128x128,128x128@2x,512x512}.png` | Tauri PNG assets. |
| `packages/mcp/icon.png` | Separate flat 512 px MCP artwork. |
| `src-tauri/Info.plist` | `CFBundleIconName = Stagistic` selects the catalog. |
| `src-tauri/tauri.conf.json` | Explicit bundle icons; `Assets.car` mapped to the root of bundle Resources. |
| `packages/mcp/scripts/build-artifacts.mjs` | Includes the 512 px artwork as the extension's `icon.png`. |

The existing mobile/Windows Store image sets are outside this macOS/MCP change.
Web, marketing and docs favicons remain unchanged. `.icns` is explicitly
included in version control; other generated local ICNS/ICO files remain ignored.

## Regeneration and use

```sh
moon run desktop:icons
moon run desktop:build
moon run mcp:verify-artifacts
```

The generator reads the current favicon geometry, builds the `.icon` with
`actool`, exports the 1024 px image with Icon Composer's own `ictool`, and
produces Apple PNG sizes with `sips`. The flat MCP SVG is rendered separately
by the existing Tauri icon command. It needs full Xcode with Icon Composer;
Command Line Tools alone are insufficient. No new npm dependencies are needed.

Restart `moon run desktop:dev` to replace its embedded development icon. For
the actual Liquid Glass appearance, run the newly built `.app`; unbundled dev
uses Tauri's static development icon. Reinstall the rebuilt MCPB through the
app to update the installed Claude extension's artwork. Existing running app
instances and installed extensions do not pick up rebuilt files automatically.

## Validation

- Icon compilation succeeded using Apple's toolchain.
- `assetutil --info` found `Stagistic` image stacks for Aqua, DarkAqua and
  Tintable, with the vector foreground, material group and legacy raster entries.
- The revised default and dark native exports were visually inspected: solid white background,
  with material lighting confined to the mark. The independent MCP export was
  visually inspected and has flat fills with no material effects.
- PNG master/export dimensions verified as 1024 and 512 pixels respectively.
- `moon run root:lint` and scoped `root:format-check` passed.
- The 10% margin revision produced the updated `.app` and MCPB. Their icon
  bytes were verified. DMG packaging failed because the temporary build image
  `/dev/disk19` could not be unmounted (resource busy); a normal detach also
  failed. No forced detach or process termination was attempted. The DMG is
  not verified for this revision.
- The built app has `CFBundleIconName = Stagistic` and byte-identical catalog
  and ICNS resources. Its catalog includes Aqua, DarkAqua and Tintable stacks.
- The PNG inside the final MCPB is byte-identical to `packages/mcp/icon.png`
  and measures 512×512. The app's bundled MCPB matches the distribution archive.
- The installed Claude extension's previous icon matched our original PNG
  exactly. Its glyph occupied `(82, 89)–(430, 423)` of the 512 px canvas.
  The revised glyph occupies `(51, 60)–(461, 452)`, with 10.0% margins on the
  left and right, rather than the
  overly tight 96% composition. This corrects our internal spacing; Claude still
  controls the size of the icon slot in its installation/list UI.
- `moon run mcp:verify-artifacts` passed (identical universal native bridge).
- `graphify update .` completed. No app/client configuration or icon cache was modified.

This validates the compiled catalog, bundle wiring and exported artwork.
Interactive Dock/Finder appearance switching and the installed Claude extension
still need a visual check on the user's running applications. No client config,
Claude installation or system icon cache was changed.
Reinstall the rebuilt extension to replace the installed icon; rebuilding
the source archive alone does not update Claude's existing copy.

Suggested commit: `fix(desktop): use Stagistic icons for macOS and MCP`
