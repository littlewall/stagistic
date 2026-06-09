---
name: stagistic-general-codestyle
description: Personal code style preferences used when writing or reviewing TypeScript/React code.
---

## Code Style Rules

- **Fat-arrow functions** always: `const fn = () => {}`
- **Max 300 lines per file** — split if longer
- **Early return / guard clauses** — no nested else blocks
- **Object lookup instead of switch**:
  ```ts
  // ❌ switch
  // ✅
  const handlers = { a: handleA, b: handleB }
  handlers[key]?.()
- **If destructuring has more than 3 properties, split into multiple lines**:
  ```ts
  // ❌ const { a, b, c, d } = obj;
  // ✅
  const {
    a,
    b,
    c,
    d,
  } = obj;
  ```
- **Use clsx for class names composition**:
  ```tsx
  // ❌ <div className={`${styles.base} ${condition ? styles.active : ''}`}> --- IGNORE ---
  // ✅ <div className={clsx(styles.base, condition && styles.active)}>
  ```
- **Use React Aria components for accessibility** (e.g. `Button`, `Tooltip`, `TooltipTrigger`), and avoid custom implementations of common UI patterns when possible. Never use React Aria directly - create a wrapper component in the `ui` package that re-exports the React Aria component with your preferred styling and behavior.
- **Use `pnpm` workspace protocol for internal package imports**:
  ```ts
  // ❌ import { Button } from '../../ui/Button';
  // ✅ import { Button } from '@stagistic/ui';
  ```
- **Use `pnpm` instead of `npm` or `yarn`** for package management, and follow the workspace conventions for adding dependencies (e.g. `pnpm add -w` for root dependencies, `pnpm add -F <package>` for package-specific dependencies).
- **Use `pnpm` scripts for dev, build, lint, and test commands**, and avoid using custom scripts or aliases that deviate from the standard `pnpm` commands.
