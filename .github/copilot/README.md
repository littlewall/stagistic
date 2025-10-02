# GitHub Copilot Configuration Guide

This document explains how GitHub Copilot is configured for the Stagistic project.

## 📁 Directory Structure

```
.github/
├── copilot-instructions.md      # Main instructions (read by Copilot)
└── copilot/
    ├── tech-stack.md            # Technology documentation
    ├── code-style.md            # Code style guidelines
    └── architecture.md          # Architecture patterns

.copilot-sessions/               # Session outputs (not versioned)
├── summaries/                   # Session summary MD files
└── contexts/                    # Session context files
```

## 🎯 How It Works

### 1. Main Instructions File

**`.github/copilot-instructions.md`**
- **Read by:** GitHub Copilot automatically
- **Purpose:** Provide project context to Copilot
- **Contains:** Quick reference to other documentation
- **Versioned:** ✅ Yes (committed to git)

### 2. Detailed Documentation

**`.github/copilot/`** directory:
- `tech-stack.md` - Complete technology list
- `code-style.md` - Coding conventions
- `architecture.md` - Architecture patterns

**Purpose:**
- Provide detailed context
- Reference material for developers
- Automatically updated as project evolves

**Versioned:** ✅ Yes (committed to git)

### 3. Session Outputs

**`.copilot-sessions/`** directory:
- Store temporary session summaries
- Store conversation contexts
- Local to each developer

**Versioned:** ❌ No (in `.gitignore`)

## 🔧 Configuration

### VS Code Settings

Copilot automatically reads `.github/copilot-instructions.md`.

For custom workspace settings, create/update `.vscode/settings.json`:

```json
{
  "github.copilot.enable": {
    "*": true,
    "markdown": true,
    "typescript": true
  }
}
```

### Environment Variables

No special environment variables needed - Copilot uses GitHub authentication.

## 📝 Maintaining Instructions

### When to Update

Update `.github/copilot-instructions.md` when:
- ✅ New major technology added
- ✅ Architecture changes
- ✅ New conventions adopted
- ✅ Important patterns emerge

### How to Update

1. **For quick updates:**
   - Edit `.github/copilot-instructions.md` directly
   
2. **For detailed changes:**
   - Update specific file in `.github/copilot/`
   - Reference stays the same in main instructions

### What to Include

**Do include:**
- ✅ Project overview
- ✅ Key technologies
- ✅ Important patterns
- ✅ File structure conventions
- ✅ Common tasks

**Don't include:**
- ❌ Sensitive information (API keys, passwords)
- ❌ Environment-specific details
- ❌ Personal preferences
- ❌ Temporary workarounds

## 🎨 Using with Copilot

### In Chat

Copilot has access to:
- Main instructions file
- All referenced documentation
- Project structure
- Code in the workspace

### Example Prompts

```
"Create a new MikroORM entity following project conventions"
"Add a new Remix route with loader and action"
"Implement magic link authentication"
```

Copilot will use the instructions to:
- Follow naming conventions
- Use correct path aliases
- Apply proper TypeScript types
- Structure files correctly

### Referencing Docs

You can explicitly reference documentation:

```
"Following the architecture guide, implement a new service"
"Using the code style guide, refactor this component"
```

## 📊 Benefits

### For Development
- ✅ Consistent code generation
- ✅ Follows project conventions
- ✅ Uses correct patterns
- ✅ Proper file organization

### For Team
- ✅ New developers get context
- ✅ Shared understanding
- ✅ Living documentation
- ✅ Version controlled

### For Copilot
- ✅ Better suggestions
- ✅ Project-aware completions
- ✅ Contextual help
- ✅ Architecture compliance

## 🔄 Workflow

### Starting a Feature

1. Open relevant files in workspace
2. Use Copilot chat with context:
   ```
   "Create a new team management feature following our patterns"
   ```
3. Copilot uses instructions + opened files
4. Review and refine suggestions

### Saving Session

If session produced valuable insights:

```bash
# Save to sessions folder
cp summary.md .copilot-sessions/summaries/2025-10-02-feature.md
```

### Updating Documentation

After implementing new patterns:

```bash
# Update relevant documentation
vim .github/copilot/architecture.md

# Commit changes
git add .github/copilot/
git commit -m "docs: update architecture with new patterns"
```

## 📁 File Ownership

| Path | Versioned | Purpose | Owner |
|------|-----------|---------|-------|
| `.github/copilot-instructions.md` | ✅ Yes | Main instructions | Team |
| `.github/copilot/*.md` | ✅ Yes | Detailed docs | Team |
| `.copilot-sessions/` | ❌ No | Temp outputs | Individual |

## 🚀 Getting Started

### For New Developers

1. Clone repository
2. Copilot automatically reads `.github/copilot-instructions.md`
3. Explore `.github/copilot/` for detailed docs
4. Start coding with context!

### For Existing Developers

1. Review `.github/copilot/` documentation
2. Update if you find gaps
3. Use `.copilot-sessions/` for personal notes

## 💡 Tips

### For Better Suggestions

1. **Open related files** before asking Copilot
2. **Be specific** in prompts
3. **Reference docs** when needed
4. **Review suggestions** - don't blindly accept

### For Documentation

1. **Keep it current** - update as you go
2. **Be concise** - Copilot prefers clear over verbose
3. **Use examples** - show patterns
4. **Link files** - reference actual code

### For Sessions

1. **Save important sessions** in `.copilot-sessions/`
2. **Use clear names** with dates
3. **Clean old files** periodically
4. **Don't commit** - kept local

## 🔍 Troubleshooting

### Copilot Not Using Instructions

1. Check file exists: `.github/copilot-instructions.md`
2. Verify it's in workspace root
3. Restart VS Code
4. Check Copilot is enabled

### Instructions Not Updating

1. Save file
2. Restart Copilot: CMD+Shift+P → "Reload Window"
3. Wait a moment for indexing

### Poor Suggestions

1. Open more relevant files
2. Be more specific in prompts
3. Check if instructions are clear
4. Review and update documentation

## 📚 Related Documentation

- [Project README](../../README.md)
- [Documentation Hub](../../docs/README.md)
- [Tech Stack](./tech-stack.md)
- [Code Style](./code-style.md)
- [Architecture](./architecture.md)

---

**Last Updated:** 2. října 2025  
**Maintained By:** Development Team
