# Сихат РКБ — design prototype

Static design prototype of the redesigned site of the paid department of the Republican Clinical Hospital in Kazan (https://rkb-sihat.ru/). Plain HTML, CSS and vanilla JS; no frameworks, no build step, no backend. The real site will later be built on Bitrix by other developers, so keep the markup plain and easy to hand off.

## Project docs (read before every task)

- docs/SPEC.md: what to build.
- docs/PROJECT_LOG.md: status, assumptions, questions, log.
- docs/research.md: current site, references, РКБ 2.0 notes.

## Working rules

- Static prototype: plain HTML/CSS/vanilla JS, mock data in data/, no network requests from the pages.
- All visual values come from css/tokens.css. Nothing outside tokens.css may hardcode colors, fonts, sizes or radii: the whole look must change from that one file. Reuse components from css/components.css and kit.html before building new ones; new shared components go into kit.html too.
- Icons: Tabler icons as inline SVG files in assets/icons. Do not add any other library without asking.
- Two designed breakpoints: desktop 1440 and mobile 360. Layouts must also hold everywhere in between.
- UI copy in Russian. Code, comments and commit messages in English. The log in Russian. Replies to the user in Russian.
- Do not add requirements that are not in SPEC.md. When something isn't defined, make the most reasonable choice, build it, record it in PROJECT_LOG.md as a new A-xx row (or reuse an existing one) and mark the code with a comment "A-xx". If a choice would change the structure of a page from what SPEC.md lists, ask the user first.
- Accessibility: semantic HTML, visible focus states, keyboard navigation, WCAG AA contrast, alt texts, labels on all form fields, prefers-reduced-motion respected.
- Before finishing any visual task, take screenshots at 1440 and 360 (and check 768 for breakage) and look at them yourself. Fix what is broken before replying.
- After any visual change, run tools/audit-layout.mjs and do not finish with new violations. `--check` only checks and changes no files; without it the script also rewrites docs/audit/layout-audit.md, audit/report.html and the screenshots, so run the full form when the report should be updated. Proposals and exceptions: tools/audit-decisions.mjs.
- The user doesn't use the terminal. Never ask them to run commands; if you need their action, give steps in the Claude app, the GitHub website, Vercel or Finder.
- Always work in the main project folder on the main branch, even if the session starts in a worktree. If you find yourself in a worktree, tell the user before doing anything.

## Scope rule (stage 1)

Stage 1 is only two pages: the home page (index.html) and the direction page «Чек-ап программы» (direction.html). Do not add screens, sections, flows, modes or features the user did not ask for. Do not change anything that is not in the user's list. If something seems needed, write it in PROJECT_LOG.md under «Предложения» and do not build it.

## Git sync (worked on locally and sometimes in cloud sessions)

- GitHub is the main copy. Pull at the start of every session. Commit and push at the end of every task.
- If you are on a branch other than main, say so at the start and remind the user to merge when done.
- Never force push. If there is a merge conflict, stop and explain it in plain words.

## Step routine (end of every step, without asking)

1. Update PROJECT_LOG.md: step status in Roadmap, new entry at the top of Журнал.
2. Commit with the step number first ("P3: home page"), add a git tag with the step ("p3"), push to main.
3. Wait for the Vercel deploy and reply with the URL and what to look at.
