# Code Style Guide

Coding standards and conventions for the Stagistic project.

## General Principles

1. **Readability First** - Code is read more than written
2. **Consistency** - Follow existing patterns
3. **Type Safety** - Leverage TypeScript fully
4. **Simplicity** - Prefer simple solutions
5. **Testability** - Write testable code

## TypeScript

### Type Definitions

**Prefer `interface` for object shapes:**
```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ Avoid (unless needed for unions)
type User = {
  id: string;
  name: string;
  email: string;
};
```

**Use `type` for unions, intersections, and utilities:**
```typescript
// ✅ Good
type Status = 'active' | 'inactive' | 'pending';
type UserWithTeam = User & Team;
```

### Strict Mode

Always use strict TypeScript:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

### Path Aliases

Use configured path aliases:
```typescript
// ✅ Good
import {User} from '~lib/db/entities/User';
import globals from '~config/globals';

// ❌ Avoid
import {User} from '../../../lib/db/entities/User';
```

### Null Handling

```typescript
// ✅ Good
const userName = user?.name ?? 'Unknown';

// ❌ Avoid
const userName = user && user.name || 'Unknown';
```

## React & Remix

### Component Structure

**Functional components only:**
```typescript
// ✅ Good
export const MyComponent = ({title}: {title: string}) => {
  return <div>{title}</div>;
}

// ❌ Avoid class components
```

### File Organization

**Route modules:**
```
app/routes/
  my-route/
    route.tsx      # Component
    loader.ts      # Data loading
    action.ts      # Form actions
    styles.module.css
```

**Shared components:**
```
app/components/
  MyComponent/
    MyComponent.tsx
    MyComponent.module.css
    index.ts       # Re-export
```

### Hooks Rules

```typescript
// ✅ Good - hooks at top level
const Component = () => {
  const [state, setState] = useState();
  const data = useLoaderData();
  
  // ... rest of component
}

// ❌ Avoid - conditional hooks
const Component = () => {
  if (condition) {
    const [state, setState] = useState(); // Never!
  }
}
```

### Props Typing

```typescript
// ✅ Good - inline for simple props
const Button = ({label, onClick}: {
  label: string;
  onClick: () => void;
}) => {
  // ...
}

// ✅ Good - interface for complex props
interface CardProps {
  title: string;
  description?: string;
  actions: Action[];
  onClose: () => void;
}

const Card = (props: CardProps) => {
  // ...
}
```

## File Naming Conventions

### Components
```
PascalCase.tsx
UserProfile.tsx
TeamList.tsx
```

### Utilities & Libraries
```
camelCase.ts
formatDate.ts
validateEmail.ts
```

### Routes
```
kebab-case/
user-profile/route.tsx
team-settings/route.tsx
```

### CSS Modules
```
ComponentName.module.css
UserProfile.module.css
```

### Tests (Future)
```
ComponentName.test.tsx
utility.test.ts
```

## Naming Conventions

### Variables & Functions

```typescript
// ✅ Good - camelCase
const userName = 'John';
const getUserById = (id: string) => {}

// ❌ Avoid
const user_name = 'John';  // snake_case
const UserName = 'John';    // PascalCase for variables
```

### Constants

```typescript
// ✅ Good - UPPER_SNAKE_CASE for true constants
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// ✅ Good - camelCase for config objects
const config = {
  maxRetries: 3,
  timeout: 5000,
};
```

### Interfaces & Types

```typescript
// ✅ Good - PascalCase, no 'I' prefix
interface User {}
type UserStatus = 'active' | 'inactive';

// ❌ Avoid
interface IUser {}  // Hungarian notation
interface user {}   // lowercase
```

### MikroORM Entities

```typescript
// ✅ Good - PascalCase, singular
@Entity()
export class User extends Base {}

@Entity()
export class Team extends Base {}

// ❌ Avoid
export class Users {}  // plural
export class user {}   // lowercase
```

## Code Organization

### Import Order

```typescript
// 1. External dependencies
import {useState} from 'react';
import {useLoaderData} from '@remix-run/react';

// 2. Internal path aliases
import {User} from '~lib/db/entities/User';
import globals from '~config/globals';

// 3. Relative imports
import {formatDate} from './utils';
import styles from './Component.module.css';
```

### Export Patterns

```typescript
// ✅ Good - named exports for utilities
export const formatDate = (date: Date) => {}
export const parseDate = (str: string) => {}

// ✅ Good - default export for components
export const MyComponent = () => {}

// ✅ Good - barrel exports
// components/index.ts
export {Button} from './Button';
export {Input} from './Input';
```

## Comments & Documentation

### JSDoc for Public APIs

```typescript
/**
 * Formats a date according to the specified format
 * @param date - The date to format
 * @param format - The desired format (default: 'yyyy-MM-dd')
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date,
  format = 'yyyy-MM-dd',
): string {
  // ...
}
```

### Inline Comments

```typescript
// ✅ Good - explain WHY, not WHAT
// Retry connection because initial attempt may fail during startup
await retryConnection(3);

// ❌ Avoid - stating the obvious
// Increment counter by 1
counter++;
```

### TODO Comments

```typescript
// TODO: Implement pagination
// FIXME: Handle edge case when user is null
// NOTE: This is a temporary workaround
```

## Error Handling

### Use neverthrow for Results

```typescript
import {ok, err, Result} from 'neverthrow';

const parseUser = (data: unknown): Result<User, Error> => {
  try {
    // validation logic
    return ok(user);
  } catch (error) {
    return err(new Error('Invalid user data'));
  }
}
```

### Async Error Handling

```typescript
// ✅ Good - explicit try/catch
const loadUser = async (id: string) => {
  try {
    const user = await db.user.findOne({id});
    return user;
  } catch (error) {
    console.error('Failed to load user:', error);
    throw error;
  }
}
```

## Database & ORM

### Entity Decorators

```typescript
import {Entity, PrimaryKey, Property} from '@mikro-orm/core';

@Entity()
export class User extends Base {
  @PrimaryKey()
  id!: string;

  @Property()
  name!: string;

  @Property({unique: true})
  email!: string;
}
```

### Query Patterns

```typescript
// ✅ Good - use query builder for complex queries
const users = await orm.em.createQueryBuilder(User)
  .where({isActive: true})
  .andWhere({createdAt: {$gte: startDate}})
  .getResult();

// ✅ Good - use findOne for simple queries
const user = await orm.em.findOne(User, {id});
```

## Validation

### Valibot Schemas

```typescript
import * as v from 'valibot';

// ✅ Good - define schemas separately
const UserSchema = v.object({
  name: v.string([v.minLength(1), v.maxLength(100)]),
  email: v.string([v.email()]),
  age: v.optional(v.number([v.minValue(0)])),
});

type User = v.Output<typeof UserSchema>;
```

## Formatting

### Line Length
- Max 100-120 characters per line
- Break long lines logically

### Indentation
- 2 spaces (not tabs)
- Consistent indentation

### Spacing
```typescript
// ✅ Good
if (condition) {
  doSomething();
}

const myFunction = (a: string, b: number) => {
  return a + b;
}

// ❌ Avoid
if(condition){
  doSomething();
}

const myFunction = (a: string, b: number) => {
  return a+b;
}
```

## Best Practices

### Performance
- Use `useMemo` and `useCallback` when needed
- Avoid inline function definitions in renders
- Lazy load heavy components

### Security
- Always validate user input
- Use parameterized queries (ORM handles this)
- Sanitize HTML output
- Never store sensitive data in localStorage

### Accessibility
- Use semantic HTML
- Include ARIA labels
- Support keyboard navigation
- Test with screen readers

---

**Last Updated:** 2. října 2025
