# Prompt to give Claude Opus 5.5 (paste everything below the line)

---

You are continuing work on **EntryDesk** (`D:\Entrydesk\EntryDesk-Live`), a Next.js 16 / Postgres karate tournament entry platform. A previous session (Sonnet 5.5) tested it end to end, fixed several bugs, re-skinned the UI, and rewrote the docs. Your job is to implement the next round of changes.

**Start here, in this order:**
1. Read `HANDOFF.md` fully. It has the verified findings, the owner's decisions, the task list with acceptance criteria, and the RingFlow export spec.
2. Read `AGENTS.md`, then `.agents/rules/testing.md` (how to run and test safely) and only the other `.agents/*` docs your current task needs.
3. The working tree has ~41 uncommitted files from the previous session. Review `git status`/`git diff --stat`, run `npx tsc --noEmit`, then (only if the owner asked for commits) make one baseline commit so your diffs are separable. Otherwise leave everything uncommitted.

**Do the tasks in HANDOFF.md §3 in order** (3.1 per-event snapshot → 3.2 chest-number uniqueness → 3.3 category snapshot for parent entries → RingFlow export (§4) → 3.5 photo verification → 3.6 coach photo gate fixes → 3.7 tests → 3.8 split large components → 3.9 housekeeping → 3.10 UI redesign last, optional).

**Owner decisions you must respect:**
- Parents can edit the athlete profile anytime, but once an athlete has applied to an event that event's entry must keep the details it was submitted with. Edits only affect future events.
- There are NO payments in this app and none should be added. Coaches collect money themselves.
- Photos stay on Vercel Blob. Do not migrate storage.
- The coach profile photo stays **mandatory** so organisers can recognise coaches; make sure the organiser actually sees it, and fix anything that breaks around the gate.
- Chest numbers must be unique per event, with a real constraint, not just a trigger.
- Export for RingFlow must match RingFlow's official-roster import columns exactly; verify by running the output through RingFlow's own `prepareOfficialRows`. Do not modify RingFlow (`D:\symm\symmetrical-memory\RingFlow-CISCE`).

**Rules:**
- **Never run writes, tests, or migrations against the Neon database in `.env`.** Read-only inspection only if essential. Use the local Docker Postgres described in `.agents/rules/testing.md`. Docker Desktop may exit mid-session: restart it and `docker start entrydesk-test-pg`.
- The production DB is live. Migrations must be additive and idempotent (`003_*`, `004_*`, …), mirrored in `schema.sql` and `src/types/database.ts`. Tell the owner the run order. Note that `002` is still pending on Neon.
- After every task: `npx tsc --noEmit` exits 0, relevant tests pass, and `.agents/*` + `AGENTS.md` are updated to match the new behaviour.
- No hard-coded hex colours (use design tokens). Never put `${}` inside a quoted SQL literal. Format DB dates with an explicit locale and `timeZone: 'UTC'`.
- Don't ask the owner questions you can answer from `HANDOFF.md` or the code. If something is genuinely ambiguous (e.g. whether withdrawn entries should release chest numbers), pick the safer option, document it, and flag it in your final report.
- Don't commit or push unless asked.

**Final report must include:** what changed per task, migration run order and rollback notes, test results (counts), anything left undone and why, and any decision you made that the owner should confirm.
