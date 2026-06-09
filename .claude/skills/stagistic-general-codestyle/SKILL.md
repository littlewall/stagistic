---
name: stagistic-general-codestyle
description: Personal code style preferences. Use when writing or reviewing TypeScript/React code.
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
