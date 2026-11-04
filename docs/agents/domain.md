# Domain documentation

Use root `GLOSSARY.md` and relevant `docs/adr/` files when they exist. If a `GLOSSARY-MAP.md` exists, read the relevant context glossaries and ADRs it identifies instead.

Missing glossary/ADR files are normal. Create them lazily when `domain-modeling` resolves a real term or an important trade-off; do not scaffold empty domain docs. Use the glossary vocabulary in specs, tickets and test names. Surface conflicts with existing ADRs before changing the design.

Read `PRODUCT.md` before UI work. Existing repository rules and `docs/` remain authoritative; the initial layout uses one glossary for the product, not one per package.
