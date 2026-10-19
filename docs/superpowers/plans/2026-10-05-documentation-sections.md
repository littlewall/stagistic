# Shared knowledge base: Editor and Syntax

The shared homepage links to two independent documentation sections. Preserve the approved palette and Lucode styling; do not write detailed instructions or migrate the landing syntax specification in this phase.

1. Define sections once, including their route prefixes and sidebar configuration. Use Starlight route middleware to expose only the current section's sidebar. Keep global search.
2. Move user-guide pages under `/editor/` and the preparatory technical reference under `/syntax/reference/`. Add section splash pages using Lucode's banner layout and a shared homepage with two entry cards.
3. Add persistent Editor/Syntax links beside the brand, with an active-section state and responsive placement. Configure Lucode's mobile drawer links from the same registry.
4. Update internal links, category proposal and authoring notes. Verify build/typecheck/lint/format, generated links, section isolation, search and desktop/mobile navigation. Refresh the knowledge graph. Leave changes uncommitted.

Adding another product later requires a section entry and its content directory, not another documentation app.

## Completion record

All four steps completed. The homepage directory and header links are generated from the same registry. Section landing pages use Lucode banners; the route middleware scopes both desktop and mobile topic navigation. Detailed articles and the landing syntax specification remain for the content phase.

Validation: docs lint, typecheck and build; scoped root format check; 13 generated pages with 303 valid internal links and 45 heading anchors; section isolation and active header states across all pages; browser review at 320/390/800/1440px, global section navigation, scoped mobile drawer and cross-section search. The knowledge graph was refreshed. No commit or deployment was made.

Independent code review: no blocking findings. The existing Lucode mobile drawer's limitation to groups of immediate links is documented in the registry and authoring notes for future sections.
