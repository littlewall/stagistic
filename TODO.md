# Pagination: line-boundary block splitting

- [x] `constants.ts`: add `MIN_SPLIT_LINES_BEFORE`, `MIN_SPLIT_LINES_AFTER`, `FIT_EPSILON_PX`
- [x] `layout/selectSplitPoint.ts`: pure split-point selection helper
- [x] `layout/selectSplitPoint.test.ts`: unit tests (exact fit, pushDown, widow clamp, ≤3-line block, continuation page, giant block)
- [x] `measure/buildLineMap.ts`: clean line-geometry enumeration via `coordsAtPos`
- [x] `layout/buildPaginationState.ts`: rewrite fit check + split branch
- [x] Delete `measure/resolveBreakPos.ts`, `measure/resolveWordBoundaryPos.ts`
- [x] Verify: `pnpm test`, `pnpm --filter @stagistic/editor lint`, `npx tsc --noEmit -p packages/editor`
