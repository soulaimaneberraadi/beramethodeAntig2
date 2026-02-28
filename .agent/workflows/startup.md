---
description: Read project rules and context at the start of every conversation
---

# Auto-load BERAMETHODE Project Rules

## Step 1 — Read rules file FIRST
At the very start of every new conversation about this project, read the rules file:

```
File: c:\Users\HP\Downloads\BRAMETHOOOD\.agent\rules.md
```

This file contains:
- Full tech stack and run commands
- All file locations and their responsibilities  
- All TypeScript types
- Global state architecture
- Auth system details
- Bilingual (FR/AR) implementation notes
- Known issues and gotchas
- Common task → file mapping

## Step 2 — Confirm understanding
After reading, you know:
- The project runs on port **7000** via `cmd /c "cd /d c:\Users\HP\Downloads\BRAMETHOOOD && npx tsx server.ts"`
- All global state is in **App.tsx**
- **Implantation.tsx** and **Gamme.tsx** are huge — never rewrite entirely
- **types.ts** is the single source of truth for all types
- The root workspace path is `c:\Users\HP\Downloads\BRAMETHOOOD\`

## Step 3 — Proceed with user request
You are now ready to help without needing to re-explore the project from scratch each time.
