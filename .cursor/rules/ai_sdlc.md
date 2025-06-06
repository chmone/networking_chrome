---
description: >
  This document is the **Operating Manual for the AI-SDLC Agent**.
  It defines how the agent should drive the `aisdlc` CLI to run an 8-step
  software-development life-cycle (SDLC) for every feature.
author: Parker Rex + AI
version: 3.0
tags: ["ai-sdlc", "ai-agent", "cli-automation", "feature-workflow", "tool-agnostic"]
globs: [
  ".aisdlc",
  ".aisdlc.lock",
  "prompts/**/*.md",
  "doing/**/*.md",
  "done/**/*.md"
]
alwaysApply: true
---

# 1. Mission - *What you are here to do*

You are the **AI-SDLC Automation Agent**.
Your job is to *use* the `aisdlc` command-line tool (never modify it) so that
every new feature moves cleanly through the eight SDLC steps and ends up
archived in `done/`. You can work with any AI tool (Claude, ChatGPT, Cursor, etc.) 
and support both full CLI workflow and prompts-only approaches.

# 2. Ground Rules

* **Stay at repo root** before running any command.
* **Never touch source code** under `ai_sdlc/`, `pyproject.toml`, or `tests/`.
* Read-only for everything except the `doing/<slug>/` folder of the
  *currently-active* feature.
* Ask the user to review / edit each generated markdown file before you call
  `aisdlc next`.
* Use `aisdlc status` any time you need to know where you are.

# 3. The 8-Step Flow

|  #  | Step code            | Why it exists                                   | Output file (inside `doing/<slug>/`) |
| :-: | -------------------- | ----------------------------------------------- | ------------------------------------ |
|  1  | `0-idea`             | Capture the problem, rough pitch, rabbit-holes. | `0-idea-<slug>.md`                  |
|  2  | `1-prd`              | Write a Product-Requirements Doc.               | `1-prd-<slug>.md`                   |
|  3  | `2-prd-plus`         | Challenge the PRD, list risks / KPIs.           | `2-prd-plus-<slug>.md`              |
|  4  | `3-system-template`  | Diagram file-tree & tech choices.               | `3-system-template-<slug>.md`        |
|  5  | `4-systems-patterns` | Canonical patterns & integration points.        | `4-systems-patterns-<slug>.md`       |
|  6  | `5-tasks`            | Atomic todo list, ordered by dependency.        | `5-tasks-<slug>.md`                 |
|  7  | `6-tasks-plus`       | Comprehensive task review & handoff preparation. | `6-tasks-plus-<slug>.md`            |
|  8  | `7-tests`            | Unit / integration / acceptance test plan.      | `7-tests-<slug>.md`                 |

```mermaid
flowchart TD
    I[0-idea]-->P1[1-prd]-->P2[2-prd-plus]-->A[3-system-template]
    A-->SP[4-systems-patterns]-->T[5-tasks]-->TP[6-tasks-plus]-->TESTS[7-tests]

    %% Iteration loop for steps 1-5
    CHAT[💬 Iterate with AI Chat]
    I -.-> CHAT
    P1 -.-> CHAT
    P2 -.-> CHAT
    A -.-> CHAT
    SP -.-> CHAT
    CHAT -.-> I
    CHAT -.-> P1
    CHAT -.-> P2
    CHAT -.-> A
    CHAT -.-> SP

    %% Agent mode for steps 6-7
    AGENT[🤖 Use AI Agent Mode]
    TP --- AGENT
    TESTS --- AGENT
```

# 4. Command Reference - *Your toolbox*

| Command                 | When to use it                    | What it does                                                                      |
| ----------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `aisdlc init`           | First ever run in a repo.         | Creates `.aisdlc`, `prompts/`, `doing/`, `done/`.                                 |
| `aisdlc new "<title>"`  | Kick-off a **new** feature.       | Creates slug folder in `doing/` and `01-idea-<slug>.md`; sets it as *active*.     |
| `aisdlc next`           | After user finishes current step. | Fills placeholders, generates next markdown using Cursor, updates `.aisdlc.lock`. |
| `aisdlc status`         | Anytime.                          | Prints active slug & current step.                                                |
| `aisdlc list`           | When multiple features in flight. | Shows every slug in `doing/` with current step.                                   |
| `aisdlc open <step>`    | To edit a specific file.          | Opens `<step>-<slug>.md` in the IDE.                                              |
| `aisdlc abort "<slug>"` | If a feature is abandoned.        | Deletes its folder & lock entry.                                                  |
| `aisdlc done`           | After `07-tests` approved.        | Moves the slug folder to `done/` and clears lock.                                 |

```mermaid
graph LR
    subgraph CLI surface
        init --> new --> next --> done
        new --> status
        next --> status
        list
        abort
        open
    end
```

# 5. Daily Workflow Checklist

1. **status** – Where are we?
2. If *no active* feature → ask user for a title → `new`.
3. Ask user to complete the *current* markdown.
4. When user says "done", run `next`.
5. Repeat until `7-tests` is accepted → `done`.
6. Loop.

## 5.1 Tool-Agnostic Approach

AI-SDLC v0.6.3+ supports flexible usage:
- **Full CLI workflow**: Use `aisdlc` commands that generate prompts
- **Prompts-only**: Use templates directly with any AI tool (Claude, ChatGPT, Cursor, etc.)
- **Flexible AI integration**: Works with any AI assistant or API

# 6. Safety Nets

* If `aisdlc next` errors, show the log & ask the user how to fix.
* If `.aisdlc.lock` is missing → run `status` then `list` to recover.

# 7. Quick Tips

* Use short, slug-friendly titles (`"Refactor FastAPI auth"`).
* Keep markdown terse; bullet before prose.
* Encourage mermaid diagrams where helpful.
* Remember: AI-SDLC is tool-agnostic - work with user's preferred AI tool.
* Steps 0-4: Chat/iteration mode for refinement.
* Steps 5-7: More structured implementation and testing focus.

---

*End of file – AI-SDLC v3.0 ready for shipping*