<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.png">
    <img src="docs/logo.png" alt="probez" width="320">
  </picture>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/probez-cli"><img src="https://img.shields.io/npm/v/probez-cli.svg" alt="npm"></a>
  <a href="https://github.com/flowzhq/flowz-probez/actions/workflows/ci.yml"><img src="https://github.com/flowzhq/flowz-probez/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/probez-cli.svg" alt="node"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/probez-cli.svg" alt="license"></a>
</p>

<p align="center">
  <strong>See what your coding agents actually did. Every session, measured locally.</strong>
</p>

Coding agents already log every session: each LLM call, every tool invocation, the timing between.
probez normalizes that into one record per LLM round and shows you where the work — and the money —
actually went. Nothing leaves your machine.

## Quick start

**1. Install.** Needs **Node 20+** and nothing else — zero runtime dependencies.

```bash
npm install -g probez-cli
```

Or skip the install and put `npx probez-cli` wherever `probez` appears below.

**2. Collect a project you work in.** Nothing to set up first: the history is already on disk, so
the first run reads months of sessions you have already had.

```bash
cd ~/any/project-you-work-in
probez collect
```

It reads [Claude Code](https://claude.com/claude-code) sessions from `~/.claude/projects`, [Cursor](https://cursor.com) transcripts from `~/.cursor/projects`, [Codex](https://github.com/openai/codex) CLI rollouts from `~/.codex/sessions` (or `$CODEX_HOME/sessions`), [GitHub Copilot](https://github.com/github/copilot-cli) CLI sessions from `~/.copilot/session-state` (or `$COPILOT_HOME/session-state`), [Pi](https://pi.dev) sessions from `~/.pi/agent/sessions` (or `$PI_CODING_AGENT_SESSION_DIR`), [OpenCode](https://opencode.ai) sessions from `~/.local/share/opencode` (or `$XDG_DATA_HOME/opencode`), [Goose](https://goose-docs.ai) sessions from `~/.local/share/goose/sessions` (`%APPDATA%\Block\goose\data\sessions` on Windows; reading OpenCode's and Goose's databases needs Node 22.13 or later), and [Cline](https://cline.bot) sessions from `~/.cline/data` and the tasks its VS Code extension keeps in each editor's storage, then writes
one record per LLM round under `~/.probez`. Run it again whenever you want to catch up — it reads
only what changed. `probez collect --all` does every project on the machine at once, and a
project it cannot collect is reported and stepped over rather than ending the run — the others are
still collected, and the command exits non-zero. A repository
used in more than one agent is one project. Cursor transcripts omit token usage; install
`probez hook --install` once so Cursor's stop hook records them, then `collect` attaches the
counts. The hook is not retroactive — only turns after it is installed get Tokens and Cost;
`collect` cannot invent usage for older Cursor sessions. Without the hook those rounds stay
outside Tokens and Cost. Copilot CLI's own log gives a real output-token count per round and a
session-wide input total at each shutdown, which is split across that stretch's rounds by output
share — an estimate for cost, never read as context; the context size Copilot records at each
shutdown is. Visual Studio's GitHub Copilot Chat is read too, from
`<project>/.vs/<solution>/copilot-chat` inside the project itself rather than from a per-user
directory — there is nowhere to list every project it has opened, so naming the project by path (or
running `probez collect` inside it) is what picks these sessions up; `--all` does not. That file has
no per-turn timestamp and no token counts, and Copilot's reasoning is encrypted at rest. Tokens,
Cost and context come instead from Visual Studio's own log, `%TEMP%\VSGitHubCopilotLogs`, which
records every model call — see *Visual Studio Copilot Chat usage* below for how long that lasts.
Each round records which product produced it; filter with `--source` or `source:` rather than
treating agents as separate projects.

**3. Look at what came back**, in the browser or in the terminal:

```bash
probez view   # the profiler: what it cost, then projects, sessions, tasks, rounds
probez        # the project as one summary — it collects first, so it stands in for step 2
```

Both are below: [the view](#the-view) first, [the CLI](#the-cli) after.

## The view

`probez view` opens a local profiler in your browser. It listens on `127.0.0.1` with a token that
is new on every run.

People open it for one of two reasons — *where did the money go* and *why did this one cost so much*
— so the menu down the left is those two sections. **Insights** answers across the whole store:
**Overview** (spend, input, cache share and cost per task, each against the period before; spend by
day and by model; the work it went on; the top findings), **Spend** (cost over time split by project,
model, agent or kind of work, with the same split ranked underneath), **Tokens & cache** (how much
input was fresh, what it cost, and what the same tokens would have cost as cache reads) and
**Context** (peak occupancy by day, the tasks that went over the line, and every compaction).
**Investigate** is the lists: **Findings**, **Projects**, **Sessions** and **Explorer**, the query
page below — and, under `probez view --debug`, **Questions** and **Trails**, which are slow to read
on a large store and so left out otherwise. Import and Settings sit at the foot of the menu, beside
when the store was last synced.

<p align="center">
  <img src="docs/view-overview.png" alt="probez view: the Overview, with spend against the period before, spend by day and by model, and the top findings" width="900">
</p>

<p align="center">
  <img src="docs/view-overview.png" alt="probez view: the Overview, with spend against the period before, spend by day and by model, and the top findings" width="900">
</p>

**One scope, everywhere.** The bar across the top holds a time range (7, 30 or 90 days, or all
time), an agent and a project, and they live in the URL — a link you send opens on the same thirty
days of the same agent. Every Insights chart and Investigate list under it is drawn from the same
rounds, so a bar on one page and a row count on another agree. On a project and the pages under it
the bar is the agent alone, since the page is already one project.

**Every number opens a list.** A day on a chart, a model, a kind of work, a row of the Spend table or
a finding lands on Sessions (or Questions, or Trails) filtered to it, with the filter shown as a chip
you can remove. Sessions is every session in the scope across every project, costliest first, with
its subagents folded under it; clicking a row opens a **drawer** with its facts, a thumbnail of its
trace, its work as a share of cost and its costliest questions, without leaving the list. *Open trace*
is the step that leaves. A project row opens the same kind of drawer — spend by day, work by cost,
models, costliest sessions. Every list has **Open in Explorer**, which hands its scope and filters
over as the query that asks the same thing; its title shows the query, and says so when a filter
has no field to carry it. Tables lead with cost; the cache-write columns are one click away under
**Token detail**, and the choice is remembered.

<p align="center">
  <img src="docs/view-sessions.png" alt="probez view: every session across the store, costliest first, with one open in the drawer" width="900">
</p>

**Findings** ranks what probez already measures by what it cost: sessions that spent over 40% of
their cost on reconstruction, tasks whose context went over 80% of the window, questions asked again,
trails that changed nothing, failed tool calls, and rounds on a model with no rate. Severity is a
finding's cost as a share of the spend in scope — high from 5%, medium from 1% — and each names the
line it was drawn at. The two lines are yours: **Settings › Findings**, stored in
`~/.probez/findings.json` beside the rates.

<p align="center">
  <img src="docs/view-findings.png" alt="probez view: findings ranked by what they cost, each with the line it was drawn at" width="900">
</p>

Below the lists, the levels are as they were: a project, then a session, then a task, down to a
single tool call. Opening a session or a task folds the menu to its icons, so the trace gets the
width.

**Search** — one query bar, on every page. `/` or ⌘K focuses it; it completes fields from the same
table the parser validates against, and their values from what the store actually holds, with the
count beside each. What comes back leads with the share rather than the row count: 56 rounds is a
number, 8.1% of what this project cost is a finding. The tabs say what the matched rounds are then
counted as — a session matches when a round inside it does, and the row reports the rounds that
matched with the size of the whole session beside them.

<p align="center">
  <img src="docs/view-search.png" alt="probez view: a query, its share of the project, and the sessions it is concentrated in" width="900">
</p>

Clicking a round opens its task with the query still in the URL, so the trace arrives with the
rounds that matched lit and the rest of the task drawn around them — the point being *where in the
task* the matches fall, which a filtered list cannot show. The bar starts scoped to whatever page
you were on; the chip beside the query is what widens it to the whole store. The Agent chip in the
scope bar filters the page you are on — same project, that agent's sessions; on Explorer it writes
`source:` into the query. Typing `source:claude` (or cursor, codex, or copilot) in the query bar is
still a search. Neither changes what Sync collects.

**A project** — where its work went, what each kind of work cost, and the sessions it happened in.
The list under it is three tabs: *sessions*, each row carrying the whole spread of its work as a bar
rather than the name of its largest slice; *trails*, every trail the project made through itself; and
*questions*, everything it needed to know and what each answer cost. Either kind of row opens the
task it happened in, with the trail or the question already open on the round it started at.

<p align="center">
  <img src="docs/view-project.png" alt="probez view: a project, its work profile and its sessions" width="900">
</p>

**A session** — the trace. Two rows over one axis: the phases the agent moved through, and the
rounds themselves, each stacked by the work it did. Click a round to open it in full — what it was
asked, what it said, and every tool call marked with the work it was counted as; the arrow keys walk
to the next. Opening a call shows the arguments it was given, and **Show result** reads what came
back out of the archived session — fetched when you ask for it, not when the page loads. A round
also says how full the model's context window its input was — green to 20%, amber to 80%, red above
it — and a round that followed an auto-compaction is drawn under a rule saying what was dropped and
how long it took.

<p align="center">
  <img src="docs/view-session.png" alt="probez view: a session trace and its work profile" width="900">
</p>

A task's trace has a third row between the two, when the task made any: brackets over the rounds
they touched, drawing either the **trails** or the **questions** — a toggle beside the axis, when
there is both to see. Neither is a stretch of rounds. A trail is what the evidence connects, so a
search interrupted by an edit and resumed four rounds later is still one search; a question is what
chased one word, so a grep run for the sixth time is still that question. The phase ribbon can show
neither. Hover a bracket for what it did and what it cost, click it to light up the rounds it
touched, and read it call by call underneath.

One lane and not two, because the two readings cover much the same rounds and stacking them would
put two near-identical bars over one strip. Hatching means the same thing in both — part of this
went nowhere: a trail that changed nothing, a question part of which was asking again. A question
answered in one call is a point rather than a span, so it gets no bracket; the note under the trace
says how many are not drawn.

Under the trace, **what it needed to know**: the same calls read the other way. A trail is what
followed something; a question is what was being asked, including the asking that got nowhere — and
since a trail's hops exist only where a call narrowed, a call that asks the same thing over again
appears in no trail at all. Clicking a question lights the rounds it touched and lists every call it
took, with `↺` against the ones that asked what had already been asked. Questions answered in a
single call are counted under the table rather than listed in it. **Explain** on any one of them
hands its calls to your own LLM and puts back the sentence it was after, beside the measured kind
rather than over it; from then on the table shows the sentence in place of the search terms. See
`probez questions` and `probez explain` below.

Three things worth knowing:

- **The axis is round index, with time as a toggle.** On a time axis the slowest round dwarfs the
  rest, so most collapse into slivers you cannot click. `working` is the time the model spent
  generating; `elapsed` adds the tools it waited on and the turns it waited on you.
- **Phases are smoothed over five rounds**, and the page says so. The raw per-round category gives
  a band every round or two, which is a barcode rather than a story. Every cell still shows what
  its own round actually was.
- **Rounds no tool saw are drawn hatched**, not dropped. They carry no label and sit outside every
  share, but a timeline missing 5% of its rounds would lie about how long the task took.

**What this machine calls things.** probez classifies a command by name, and it only ever sees the
last part of a path — a repository's own `bin/check` arrives as `check`. A name that generic cannot go in
the table probez ships, where it would relabel an unrelated `check` on somebody else's machine, so
Settings has a list of the commands *this store has run and nothing has classified*, most-used
first, and a kind to give each. It is stored in `~/.probez/commands.json` and read over the shipped
table, so it can correct a name as well as add one. Anything left unnamed stays unclassified, which
is reported rather than guessed at.

**Settings** is five tabs: Pricing, Commands, Findings, Reader and Data. **Pricing** holds the token rates every cost is computed from — one row per model, five rates
each, at published list prices and yours to change. Stored in `~/.probez/pricing.json`, owner-only,
and read *over* the shipped table rather than instead of it: correcting one rate leaves the rest
free to move when a later probez ships a new model, while a row you empty stays empty. A model id
matches past a dated suffix, so a rate against `claude-haiku-4-5` also covers the
`claude-haiku-4-5-20251001` rounds Claude Code actually records — and no further than that, so a
model nothing has priced is reported as unpriced instead of billed at a lookalike's rate.
Under them sits the **reader**: the command *explain* runs, and the only program probez starts at
your direction. It is argv and not a shell line, it runs only when you press explain on one question,
and leaving it blank leaves probez with nothing it could run. One other program
probez starts, and it is not one you configure: `git log`, during collection, in a project whose
reflog cannot say what a task began from — read-only and local, described under
[Privacy](#privacy).

At the bottom, behind its own heading, is the **danger zone**: the two operations that remove more
than one project. *Trim old history* takes every session older than a window you pick, and the
archived transcripts beside them; *clear the whole store* takes every project. Neither acts on its
first press — both show what would go, the largest projects named rather than only counted, in a
panel you have to open. Your rates and your reader are settings rather than projects and stay.

The **projects list** is ordered newest-activity-first, and its **Project**, **Last activity** and
**Updated** headings sort it. The last two are different questions and both are on the page: *Last
activity* is when the most recent round in a project ran, and *Updated* is when probez last went and
looked — collected here, or imported from a file. Sorting by *Updated* is how you find the projects
you have not synced lately, which is not a thing the work dates can tell you. A project with no date
sorts last whichever way the arrow points, since an unknown date is not an old one.

Its **Work** column is the same pair the project page draws, at row size: the bar is the mix of work
by rounds, and under it is the largest of those with what that work cost — the number the project
page shows in its *Share* column, so the two say the same thing about the same project. A project
none of whose models has a rate has no money to divide; its share is of the rounds instead, and the
row says so rather than letting one figure stand for two different denominators. Between the two
there is a project where *most* of the work is unpriced — an imported store where half the rounds
recorded no model, say. A share of money is still the better answer there, but it is an answer
about the priced half, so the row and the project page's *Share* heading both carry a mark saying
how many rounds the money covers.

Each project carries a **⋮** menu, on its own page and on every row of the projects list. *Sync*
runs `collect` then `analyze` for that project, and is on a session page too, beside the header — a
run you are still reading is where you notice the agent has kept working, and there is no smaller
sync to offer there, since an agent writes its log per project and `collect` reads all of it.
*Rename* gives it a name of your own — a label, on this machine, that the CLI answers to as well;
nothing moves, since a project's directory in the store is a hash of the path an agent ran in, and
clearing the field puts the derived name back.
*Export* hands its rounds or a full bundle to your browser to save, and *Darken the export* above
those two decides what either one writes — on, the prompts and paths go out replaced and the figures
go out whole, which is what makes a project safe to send to somebody outside the work. It changes
the file and only the file; the screen goes on showing your own work in full, which is what it is
for. Both export rows read *darkened* while it is on, so a toggle whose effect lands in a file you
have not written yet still shows you something. *Delete*
removes the project and
everything probez recorded for it, after asking; the agent's own session files are not touched, so a
collected project comes back with `probez collect` minus whatever the agent has since pruned, and an
imported one does not come back at all. **Import** on the projects page reads a file someone sent
you — which is also why the view opens on an empty store, and why a project that arrived that way is
marked `imported` in the list, and `darkened` beside it when it came in redacted.

*Merge from another computer* is for the same project worked on from two machines. Export it on one
(either format), pick the file from the menu on the other, and its rounds join the ones collected
there, read as one project. Every export names its rounds for whoever made it — **Settings › Data ›
Who you are**, or git's `user.name` until you set one — so once a store holds more than one person's
work the scope bar has a **Committer** chip, and every chart can show yours, theirs or both. Merging
the same file again changes nothing; a newer one brings what is new.

## The CLI

Everything the view shows, one table at a time. The levels nest, and every level has a name you can
type back:

```
project                a directory an agent was started in    its name, or its path
└─ session             one agent run                          504799b8
   ├─ subagent         one run the agent handed off           504799b8/a8261ff4
   └─ task             a user turn, and everything it led to  504799b8#3
      └─ round         one LLM call                           504799b8#3.12
         └─ tool call                                         shown in full by its round
```

| Command | What it does |
| --- | --- |
| `probez [project]` | Collect, then summarize |
| `probez projects` | Every project on this machine |
| `probez sessions` · `session <id>` | One row per session, or one session as its tasks |
| `probez tasks` · `task <id>` | One row per task, or one task and every round it took |
| `probez rounds` · `round <id>` | One row per round, or one round with every tool call |
| `probez tools` | Every tool called, and what `Bash` actually ran |
| `probez trails` · `trail <id>` | Runs of calls that followed one another into the repository |
| `probez questions` · `question <id>` | What the agent needed to know, and what finding out cost |
| `probez explain <id>` | Ask your own LLM what one question was, in a sentence |
| `probez find "<query>"` | One query over everything collected |
| `probez analyze` | Where the work went |
| `probez view` | Open the profiler |
| `probez collect` | Collect one project, or every project under a folder |
| `probez hook` · `hook --install` | Record Cursor stop-hook token usage (opt-in) |
| `probez export <project>` | Write a project out as a file to send someone, `--darken` to redact it |
| `probez import <file>` | Read a project someone sent you; `--into <project>` merges it into one of yours |
| `probez clear` | Remove a project, everything, or everything older than a window |

Lists take `--limit` and always say how many rows they withheld. `rounds` filters by `--session`,
`--task`, `--tool`, `--command`, `--kind`, `--category`, `--target`, `--agent` and `--errors`, and
`sessions` takes `--agent` too. `find` takes `--all`, `--in`, `--sort` and `--plan`.
`analyze` takes `--by`, `--split` and `--unclassified`. `trails` takes `--deep`, `--min-depth` and
`--outcome`. `questions` takes `--kind` and `--min-calls`, and `explain` takes `--again` and `--prompt`.
`clear` takes `--all`, `--before` and `--yes`, and `collect` takes `--since`.
`export` takes `--bundle`, `--darken` and `--out`, and `import` takes `--as`.
`--source` on `collect` and `projects` selects which agent directories to scan (Claude Code, Cursor,
Codex, Copilot, or all). On the read commands — `sessions`, `tasks`, `rounds`, `analyze`, `tools`, `find`,
`trails`, `questions`, `view` — the same flag filters already-collected rounds and does not restrict
discovery. `source:claude` is that filter in a query, and matches persisted `claude-code`. `--json`
works everywhere. `probez --help` lists every flag under the command it belongs to.

**Cursor token usage.** Transcripts do not include counts. Once:

```bash
probez hook --install
```

Cursor's `stop` hook writes each parent-agent turn's tokens into `~/.probez/cursor-usage.jsonl`.
The next `probez collect` attaches them to matching Cursor tasks — split across tool-using rounds
by the same weights as the work categories, not onto a trailing prose-only reply. Claude and Codex
usage still come only from their own logs. Without the hook, Cursor Tokens and Cost stay blank.
Copilot CLI has no hook to install: its own log is what Tokens and Cost come from.
Past Cursor turns from before the hook was installed stay blank too — collect does not backfill
them.

**Visual Studio Copilot Chat usage.** Nothing to install. Visual Studio logs every model call it
makes — the whole prompt it sent, how much of that was cached, what came back — under
`%TEMP%\VSGitHubCopilotLogs`, and each `probez collect` on a project with Visual Studio chats copies
what those logs hold into `~/.probez/copilot-vs-usage.jsonl`. A round gets the calls it made summed
for Tokens and Cost, and the largest single prompt among them for context, measured against the
prompt cap Copilot itself puts on the model — 128,000 for `gpt-5-mini`, not OpenAI's 272,000.

**This only works for chats whose log still exists.** Visual Studio keeps these logs only briefly —
a new one each launch, older ones cleared — so a chat from before probez first read its log has no
usage and never will: nothing else on disk records it. Run `probez collect` while the log is still
there and the numbers are kept from then on, through log cleanup and store rebuilds alike. Cost is
at the API list rate for the model, the same as every other source; Copilot itself bills by premium
request, not by token. With two Copilot Chat windows answering at once, the log does not say which
call belonged to which, and a call can land on the wrong one of the two.

Every example below is probez run on its own repository: the sessions in which probez itself was
built.

```console
$ probez probez

probez  probez  ~/Dev/workspace/probez

  sessions   7         rounds   198      tasks  25
  tokens     22.2M in · 114.2K out
             396 new · 788.4K cached · 21.5M reused  (96% reused)
  span       Oct 11 – Oct 18, 2026
  top tools  Bash 159 · Edit 28 · Read 4 · Artifact 3 · AskUserQuestion 3

  up to date, 7 sessions unchanged
  → ~/.probez/projects/probez-fe64e716/rounds.jsonl
```

Sessions of a project, newest last:

```console
$ probez sessions probez

  probez  ~/Dev/workspace/probez

  SESSION    SOURCE   ROUNDS  TASKS  TOOLS           IN        PEAK      OUT       COST  WORK       LAST
  b96ebc15   claude       74      5  82 ✗2        11.2M  196.1K/20%    61.6K      $6.50  Recon 62%  22 days ago
  276c23b3   claude       72      5  79 ✗1         7.8M  144.9K/14%    28.1K      $2.96  Recon 51%  22 days ago
  0d280418   claude       24      9  16 ✗1         1.7M    77.8K/8%     5.1K      $1.40  Deliv 70%  21 days ago
  934cea53   claude        5      1  4           207.7K    42.8K/4%     3.3K      $0.35  Recon 100% 21 days ago
  5c6e8215   claude        3      1  2           140.6K    47.6K/5%     1.4K      $0.33  Recon 100% 20 days ago
  a7c3b2f4   claude        4      1  3           191.7K    50.3K/5%     2.4K      $0.38  Recon 100% 20 days ago
  1b8ea982   claude       16      3  14 ✗2         1.0M    77.9K/8%    12.2K      $0.96  Recon 96%  17 days ago

  7 sessions · 198 rounds · $12.88
  `probez session <id>` shows one of them, task by task.
```

When the agent hands work to a subagent, that run is a session of its own, named for the one that
handed it over (`504799b8/a8261ff4`). It is a separate context with its own model and its own bill,
so it is counted separately rather than folded into the session that delegated it: `sessions` grows
an `AGENT` column marking each row `main` or `sub`, and `probez session <id>` says underneath a
session's own tasks what it handed off, and what that cost. A session as its tasks, each with the
commit the tree was on when it was asked:

```console
$ probez session probez b96ebc15 --limit 3

  probez  ~/Dev/workspace/probez

  session b96ebc15  ·  5 tasks · 74 rounds · 11.2M in · 61.6K out · 2 tool errors · Oct 11 – Oct 13, 2026

  TASK         ROUNDS       IN     OUT     TIME  WORK       FROM     ASKED
  b96ebc15#1       13     1.1M   33.5K     5.2m  Recon 56%  df3a1c1  look at the probez app a…
  b96ebc15#2        4   519.7K    3.9K    44.7s  Recon 50%  df3a1c1  answers - Where should t…
  b96ebc15#3        3   407.7K     914    20.0s  Plan 50%   22601cf  just pulled and new layo…

  showing 3 of 5 tasks · 74 rounds, --limit 0 for all. `probez task b96ebc15#1` shows one in full
```

`tasks` is the same list across sessions, and takes `--session` to stay inside one:

```console
$ probez tasks probez --session b96ebc15 --limit 8

  probez  ~/Dev/workspace/probez

  TASK         ROUNDS       IN     OUT     TIME  WORK       FROM     ASKED
  b96ebc15#1       13     1.1M   33.5K     5.2m  Recon 56%  df3a1c1  look at the probez app a…
  b96ebc15#2        4   519.7K    3.9K    44.7s  Recon 50%  df3a1c1  answers - Where should t…
  b96ebc15#3        3   407.7K     914    20.0s  Plan 50%   22601cf  just pulled and new layo…
  b96ebc15#4       52     8.8M   22.9K     4.3m  Recon 66%  22601cf  i would like to create a…
  b96ebc15#5        2   391.9K     488     7.0s  Deliv 100% a6a2090  npmjs login then publish…

  5 tasks. `probez task <id>` shows one in full
```

**`FROM` is where the task began, not what it produced.** Tasks 1 and 2 both start from `df3a1c1`,
so those two asks were made against the same tree; the hash then moves, which is the work landing
in between — task 3 opens with "just pulled". It is read from git's HEAD reflog when the project is collected,
and it is blank for a project that is not a checkout.

A reflog only reaches so far — git expires it at 90 days, and a fresh clone arrives holding a single
line — so for a task older than that, probez reads the commit history behind it instead, and takes
the newest commit that had been made by the time the task was asked. That second answer is an
inference rather than a record, and it is the one case where `probez` runs `git` rather than reading
a file. It runs only where it can add something: a reflog that still holds the repository's first
commit covers every moment that repository has existed, and nothing else is consulted for one.

And what the work actually was:

```console
$ probez analyze probez

  probez  ~/Dev/workspace/probez

  WORK                  ROUNDS    SHARE   TOKENS      COST  ERRORS      TIME      OUT
  Planning                13.2     4.9%     8.1%     $0.59     1.0     13.8s     4.7K
    read                  10.2     3.9%     6.6%     $0.46     1.0      7.7s     3.4K
    clarify                3.0     1.1%     1.5%     $0.13       ·      6.2s     1.3K
  Reconstruction           101    58.2%    57.0%     $6.92     7.0      1.5m    36.4K
    locate                51.4    25.5%    29.2%     $3.04     4.0     53.9s    19.5K
    read                  27.6    15.1%    13.5%     $1.79       ·     14.2s     9.5K
    inspect               14.7    11.8%    10.6%     $1.41     3.0     15.1s     5.1K
    graph                  7.3     5.7%     3.6%     $0.68       ·      5.5s     2.4K
  Implementation          11.6     9.4%     7.1%     $1.12       ·      4.1m    34.8K
    modify                10.6     4.8%     6.5%     $0.57       ·     56.2s    10.7K
    create                 1.0     4.6%     0.6%     $0.55       ·      3.1m    24.1K
  Testing                 10.1     3.5%     6.3%     $0.42     1.0      9.8s     4.2K
    run                    8.6     3.0%     5.3%     $0.35     1.0      7.6s     3.6K
    test                   1.4     0.5%     1.0%     $0.06       ·      2.1s      669
  Documentation            5.5     2.5%     4.3%     $0.30       ·     29.5s     4.6K
    system                 3.7     1.9%     3.1%     $0.22       ·     25.3s     3.8K
    change                 1.8     0.6%     1.2%     $0.07       ·      4.2s      814
  Delivery                23.1    14.5%    13.0%     $1.72     1.0     22.1s     7.0K
    branch                 8.0     3.3%     3.1%     $0.39       ·      3.4s     1.4K
    publish                6.5     5.6%     3.6%     $0.67     1.0      5.0s     1.6K
    build                  4.6     4.0%     3.3%     $0.48       ·      8.1s     1.9K
    commit                 4.0     1.5%     3.0%     $0.18       ·      5.6s     2.1K
  Environment              2.5     0.7%     1.4%     $0.08     1.0      2.3s      733
    env                    1.3     0.3%     0.7%     $0.04       ·     904ms      284
    deps                   1.1     0.3%     0.6%     $0.04     1.0      1.4s      450
  Unclassified             6.9     6.4%     2.9%     $0.76     1.0      6.7s     2.9K
    unknown                6.9     6.4%     2.9%     $0.76     1.0      6.7s     2.9K

  174 rounds did something a tool can see, out of 198. Share is of the $11.89 they cost. Tokens is of the 20.1M they moved
  24 rounds of prose only (12.1%) · 4.0% unclassified · 70.9% of work has a known target
  2.3M tokens sit outside Tokens: prose-only rounds
  Unclassified is mostly probez, Artifact, Skill. --unclassified lists it
  40.9% of the finding was inside 7 trails, 2 of which ended in a change
  The deepest went 4 hops from a probe: `probez trail 1b8ea982#1.0`
```

Most of what the agent spent building probez went on finding its way back around probez:
Reconstruction is 58% of the bill, Implementation under a tenth.

**Share is of money; Tokens is of volume.** `ROUNDS` says how much of the work a category was;
`SHARE` says how much of the bill; `TOKENS` says how much of the input+output. Cost is worked out
per round from its own model's rates, then split across that round's work. The last lines are part
of the answer: rounds of pure prose, tools with no entry in the table, models with no rate, and
rounds with no usage recorded sit outside those shares, and are reported rather than guessed at.

Where *nothing* is priced there is no bill to divide — a Cursor transcript records no token counts at
all — so `SHARE` falls back to the share of the rounds and the coverage line says which of the two
you are reading. Set a rate under Settings and it goes back to being a share of money.

### Search: one query over everything

Every table above answers one question through a fixed hole — one flag per field, and no way to
combine two of them. `probez find` is the other direction: one grammar over the whole record, so a
question that crosses two levels can be written down.

Bare words are free text, over the prompts, the prose, the commands and the paths. A `key:value`
filters, `-` negates, one after another means and, `OR` is the other one, and brackets regroup.

```console
$ probez find 'category:reconstruction cost:>0.20 -tool:Read' probez

  probez  ~/Dev/workspace/probez

  8 rounds · $3.33 · 4.0% of rounds · 25.9% of cost · 6 sessions · 89% reconstruction

  ROUND           WORK                COST     TIME         WHEN  SAYS
  1b8ea982#1.0    Reconstruction     $0.29     1.4s  17 days ago  Suggest a fix for the finding F36 **No …
  a7c3b2f4#1.0    Reconstruction     $0.27     1.6s  20 days ago  Suggest a fix for the finding F21 **Ove…
  5c6e8215#1.0    Reconstruction     $0.28     1.5s  20 days ago  Suggest a fix for the finding F3 **Logs…
  934cea53#1.0    Reconstruction     $0.23     1.2s  21 days ago  Suggest a fix for the finding F1 **Save…
  276c23b3#1.0    Reconstruction     $0.24    832ms  22 days ago  install the latest (0.8.0) problez-cli …
  b96ebc15#4.20   Reconstruction     $0.92     1.6s  22 days ago  i would like to create a major release
  b96ebc15#3.17   Reconstruction     $0.88     1.2s  24 days ago  just pulled and new layout - how do i r…
  b96ebc15#1.0    Reconstruction     $0.24     1.6s  24 days ago  look at the probez app and suggest a be…

  8 rounds
```

**The first line is a share, not a count.** Eight rounds is a number; a quarter of what this
project cost is a finding — and most of those rounds are the first of their session, the agent
orienting itself before it could do what it was asked. A query does not filter a listing, it re-scopes the profile — the same idea as pprof's
`-focus`, and the reason the totals, the concentration and the distribution come before any row of
it.

`--in` says what the matched rounds are then counted as. A session, task or project matches when a
round inside it does, and the row reports the rounds that matched with the size of the whole thing
beside them, so a task that spent eight of its thirty-six rounds on what was asked for reads as
eight:

```console
$ probez find '(tool:Edit OR tool:Write) in:tasks sort:cost' probez --limit 5

  probez  ~/Dev/workspace/probez

  14 rounds · $1.25 · 7.1% of rounds · 9.7% of cost · 2 sessions · 49% implementation

  TASK         ROUNDS    OF       COST  ASKED
  b96ebc15#1        1    13      $0.55  look at the probez app and suggest a better, cleaner…
  276c23b3#3        8    36      $0.38  yes, fix clear --all
  b96ebc15#4        3    52      $0.19  i would like to create a major release
  b96ebc15#2        1     4      $0.09  answers - Where should the app open? Overview. Findi…
  276c23b3#5        1    12      $0.05  release 0.8.1

  5 tasks
```

`--all` searches every project in the store rather than one. `sort:` puts the big end of a magnitude
first, `limit:` and `in:` can be written into the query instead of passed as flags, and `--json`
carries the whole result — totals, share, distribution and rows.

**A half-typed query is read the same way a finished one is.** What cannot be read yet is said,
under the part of the query it is about, and everything else still runs; a value that is merely
missing narrows nothing rather than blanking the list. `--plan` prints that reading on its own,
which is a way to find out what probez made of a query without it going near a store:

```console
$ probez find 'cost:> categoy:test' --plan

  cost:> categoy:test
  ^^^^^^
  `cost:` needs a value
         ^^^^^^^^^^^^
  there is no `categoy:` field, so this is being searched for as text — did you mean category:?


  read as   categoy:test
  counting  rounds
  fields    ·
  sort      newest first
  limit     50
```

`probez --help` lists every field a query can name, with what each one reads. The filters on
`rounds` are the same language underneath — `--tool Bash` is `tool:Bash`, `--source cursor` is
`source:cursor`, down to the comparison — so the two cannot come to disagree about what a tool name
is or how a command is matched. `source:claude` matches persisted `claude-code`.

**Free text matches a word, or the start of one.** `tok` finds `tokens`; `oken` does not, and
`"npm test"` does not find `pnpm test`. That boundary is what makes the search fast enough to be
worth having: `collect` and `analyze` write a compact index beside the rounds — about a fifth of
their size — holding every field a query can name, so a query is answered from its columns and only
the rounds that actually matched are ever read off disk. On a 93 MB store of 48,000 rounds that is
the difference between 300 ms and 1.4 s across every project at once, and between 60 ms and 260 ms
within one.

The index is derived data in the strict sense: deleting it costs speed and nothing else. A project
that has not been collected since it existed, or whose rounds have moved underneath it, is read in
full and the footer says how many were — since being told is the only way to tell a quick search
from a slow one. `find` itself never writes one; reading writes nothing, here as everywhere.

### Errors: what actually went wrong, and what only looked like it

The harness sets one flag on a failed call, and one flag is the wrong shape for the question. It
fires for a `grep` that matched nothing, for a suite that failed, for an `Edit` whose anchor had
moved, for a plan you rejected, and for an MCP server that was not running. Those are five different
facts and only one of them is a mistake anyone can act on. Counted together they produce an error
rate that cannot come down, because most of what it counts was never wrong.

So every failed call carries a **kind**, read once from the result body at collection and stored as
one word. `error:` filters on it:

| Kind | What it is |
| --- | --- |
| `harness` | the agent misused the tool: an unread file written to, an edit anchor that had moved, a bad argument |
| `exit` | a command the agent ran exited non-zero |
| `limit` | the call hit a tool ceiling: a file too large to return, a `Read` aimed at a directory |
| `schema` | the model's structured output did not satisfy its schema |
| `remote` | an MCP server, a browser or a network call failed |
| `nomatch` | a search or comparison found nothing — an answer, not a failure |
| `denied` | you declined the call, or a permission rule did |
| `other` | flagged, and not recognised as any of these |

`nomatch` and `denied` are not faults, and are counted apart from the failures everywhere — as
`NOFAULT` in the tools table, as `is:benign` in a query, and outside `errors:` and `is:error`
entirely:

```console
$ probez tools probez --limit 3

  probez  ~/Dev/workspace/probez

  TOOL                 CALLS  ERRORS  NOFAULT    RESULT      TIME
  Bash                   159       6       ·    325.7K     16.6m
    grep                  90       1       ·    174.0K      8.9m
    cd                    76       4       ·    157.9K      3.9m
    head                  73       3       ·    160.2K      5.5m
      … 63 more, --limit 0 for all
  Edit                    28       ·       ·      3.0K      7.1m
  Read                     4       ·       ·      1.3M     56.4s
  Artifact                 3       ·       ·     38.4K      3.1s
  AskUserQuestion          3       ·       ·       839     18.0s
  Glob                     1       ·       ·        36      2.2s
  Skill                    1       ·       ·        20      69ms
  Write                    1       ·       ·       224      71ms

  8 tools · 200 calls · 6 errors
  66 commands under Bash. A call that ran several is counted for each
```

These sessions happen to hold no no-fault calls, so `NOFAULT` is empty here and the footer says
nothing about it. Where there are some, the footer counts them on a line of their own, and the
clearest case is usually `ExitPlanMode`: a plan you turned down is flagged by the harness exactly
as a failure is, and counted as one it reads as a tool failing every time you said no.

The kind worth chasing is `harness`, because every one of them is a protocol mistake with a fix —
`probez find "error:harness" --all` is the list. `exit` is the agent's shell reporting on the world
and mostly says what the repository was doing, not what the agent did wrong.

**What this cannot see.** Cursor records a tool result as a name and nothing else — no body, no
status, no flag — so every error question comes back empty for a Cursor session rather than wrong.
That is not "no errors"; it is "not recorded", and on a store with Cursor sessions in it that can be
a third of every round. Codex records an exit code and is read the same way Claude Code is.

### Trails: how the agent found its way around

An agent that does not know a repository finds its way around it. It lists the tree, opens what the
listing named, greps for a word, reads the lines the grep hit. Every one of those calls is
Reconstruction, and a tally of Reconstruction cannot tell five hops of one search from five unrelated
file opens. A **trail** is that search:

```console
$ probez trails probez --deep --limit 8

  probez  ~/Dev/workspace/probez

  TRAIL           STEPS  DEPTH  WIDE  PATHS  ROOT     OUTCOME        IN    TIME
  1b8ea982#1.0        5      4     2      9  probe    abandoned  267.5K    4.6s
  1b8ea982#2.7        3      3     1      8  probe    test       167.2K    4.3s
  1b8ea982#3.12       3      3     1      4  probe    abandoned  222.2K    2.4s
  276c23b3#2.5        4      2     3      2  probe    edit       294.1K    1.5s
  276c23b3#3.19       8      5     3      9  doc      edit       804.7K    3.2s
  276c23b3#3.23       8      4     4      6  probe    edit       744.3K    3.0s
  276c23b3#5.60       3      3     1      5  doc      edit       408.8K    2.6s
  934cea53#1.0        4      3     2      7  path     abandoned  164.9K    2.7s

  showing 8 of 12 trails, --limit 0 for all · 12 proven from result bodies
  `probez trail <id>` draws one of them, hop by hop.
```

`DEPTH` is how far the search went and `WIDE` how far it fanned from a single call — a listing whose
output feeds five reads is wide and shallow, a chain of follows is deep and narrow. `ROOT` is what it
started from and `OUTCOME` whether it ended in a change to somewhere it had been. A trail is named by
the round it starts at, and asking for any round it passed through finds it:

```console
$ probez trail probez '276c23b3#3.23' --deep

  trail 276c23b3#3.23 → 3.48 · 8 steps · proven
  depth 4 · breadth 4 · 6 paths · 1 revisited
  from a probe · edit src/result.ts · 744.3K in · 3.0K out · 3.0s

  ROUND   REACHED FOLLOWED                CALL
  3.23    dir     started here            .flowz/q callers planClear; .flowz/q callers ap…
  3.24    span    listed test/clear.te…     sed -n '1,90p;205,275p' test/clear.test.ts; s…
  3.25    span    listed src/cli.ts         sed -n '2085,2165p;2215,2260p' src/cli.ts
  3.26    span    listed src/store.ts       Read src/store.ts:1225-1239
  3.28    file    listed src/store.ts       grep -n "^import" src/store.ts | head -20
  3.29    span    narrow src/store.ts         sed -n '3,15p' src/store.ts
  3.47    span    narrow src/store.ts         sed -n '536,549p' src/store.ts; .flowz/q de…
  3.48    dir     listed src/result.ts          sed -n '1,181p' src/result.ts; ls ~/.prob…

  `probez round 3.23` shows any one of these calls in full.
```

`CALL` is what actually ran, indented by how deep into the walk it sits, and `FOLLOWED` is the
evidence for each hop. There are three kinds of evidence. `listed` means the path was in
the earlier call's own output, which is proof — and reading it needs the archived session, which is
what `--deep` is for. Without the flag a hop is inferred from what the calls asked for: `probe`, a
search for a word and then a file carrying it, and `narrow`, a file under a directory already
reached. Each trail says which kind it had, on the `proven`/`inferred` line.

The two readings are not two views of one answer. Against probez's own store the deep read finds
about half again as many steps, and it roots a trail further back — the same search the shallow read
names `1.5` is named `1.0` once the listing that started it becomes visible. It is not strictly a
superset either: a better-sourced hop can regroup a trail, and a fragment left under the three-call
floor stops being one.

### Questions: what it needed to know, and what that cost

A trail is a walk that went somewhere. Its edges exist only where a call *narrowed* — a smaller
scope, a file under a directory already reached — so a call that asks the same thing over again
narrows nothing, forms no edge, and joins no trail. In probez's own store a third of all finding is
exactly that, and a tenth of it reaches a trail. The trail keeps the productive hops and drops the
thrash, which is the wrong way round for anyone asking what navigation costs.

A **question** is the other reading of the same calls: one thing the agent needed to know, and every
call it spent finding out, whether or not any of them got anywhere.

```console
$ probez questions probez --min-calls 2 --limit 6

  probez  ~/Dev/workspace/probez

  QUESTION        CALLS  AGAIN  FETCH  GUESS  KIND          IN    TIME  ASKED ABOUT
  276c23b3#3.20      13      5     10      1  outline     1.2M    4.0s  clear planclear applyclear im…
  b96ebc15#4.41       8      0      2      4  flow        1.4M    2.1s  source control projects list …
  1b8ea982#2.7        4      0      1      3  covers    237.7K    4.6s  opencode need node skipped wa…
  b96ebc15#4.32       4      1      2      0  flow      621.2K    5.0s  opus tables
  276c23b3#2.6        3      2      2      0  outline   229.2K   513ms  —
  b96ebc15#1.1        3      0      2      0  outline   191.5K    1.7s  —

  showing 6 of 18 questions, --limit 0 for all
  67 asked in all · 110 calls · 1.64 per question · 18 took more than one
  AGAIN is the same words asked of the same places over again.
  KIND, in these rows:
    outline   what does this file declare
    flow      where does this value travel across layers
    covers    what constrains this — the tests that exercise it
  `probez question <id>` shows every call one of them took.
  `probez explain <id>` asks your own LLM what one of them was, in a sentence.
```

`CALLS` is what the question cost. `AGAIN` is the same words asked of the same places over again.
`FETCH` is calls that only turned a line number into a body — the second half of locate-then-fetch,
protocol overhead rather than thinking. `GUESS` is calls that named three or more different words at
once, which is an agent reaching for vocabulary it has not learned yet.

`KIND` is which question it was, decided by the first rule that reads the calls:

| kind | what it stands for |
| --- | --- |
| `define` | show me this symbol's body |
| `refs` | where is this used |
| `outline` | what does this file declare |
| `flow` | where does this value travel across layers |
| `touches` | every artifact naming a concept, code and prose alike |
| `covers` | what constrains this — the tests that exercise it |
| `other` | asked something no rule in the table reads |

The listing prints the ones it used under the table, a detail view glosses the one it is showing,
and `probez questions --help` carries the whole of it — a kind is one word, and one word never says
what it means. There is no `path` — how does A reach B — because no grep expresses that question, so
no reading of a grep can recover it.

A question is named by a round it was asked at, and asking for any round in it finds it:

```console
$ probez question probez 276c23b3#2.6

  question 276c23b3#2.6 → 2.11 · 3 calls · outline — what does this file declare
  asked about nothing by name
  1 place · 2 re-asked · 2 fetched a body · 229.2K in · 539 out · 513ms

  ROUND   REACHED ASKED                     CALL
  2.6     file    —                         probez clear --all --json 2>&1 | head -60; du…
  2.9     file    — ↺                       probez clear --all --yes 2>&1 | tail -5; echo…
  2.11    dir     — ↺                       cd ~/.probez && du -sh * | sort -h | tail; du…

  `probez round 2.6` shows any one of these calls in full.
```

`CALL` is the command itself, because a run of commands at one place is obvious as a column of
commands and merely plausible as a column of derived labels — the reason there is no separate
`WHERE`, too: a command names its own paths. The `↺` marks a call that asked what the question had
already asked. Three calls at one place, one thing wanted — what is left in the store — and two of
them asked it again, which is a shape that no trail records, because none of the three narrowed
anything for the next.

### Explain: the same question, read back by your own LLM

`KIND` is a rule, so it holds for six shapes and says `other` for everything else. `explain` is the
sentence instead — and it comes from a model you already have, not from probez.

Write the command in `~/.probez/reader.json`, or set it under **Settings** in the view:

```json
{ "command": ["claude", "-p"] }
```

`["ollama", "run", "llama3"]` works the same way, and so does anything else that reads a prompt on
stdin and prints an answer. Then ask about one question:

```console
$ probez explain probez 276c23b3#3.20

  question 276c23b3#3.20 → 3.48 · 13 calls · outline — what does this file declare
  asked about clear, planclear, applyclear, import
  read as  How does the `probez clear` command work, from the CLI handler through
           planClear/applyClear in the store, and what session data on disk does it actually
           remove?
           other, not outline · the agent looked up clearCommand/planClear, their callers
           and tests, then read store, viewdata, insights and result code and measured the
           size of a real sessions directory, which is a how-does-this-feature-work question
           rather than a single symbol, reference or coverage lookup · claude
  8 places · 5 re-asked · 10 fetched a body · 1 guessed at words · 1.2M in · 3.7K out · 4.0s

  ROUND   REACHED ASKED                     CALL
  3.20    dir     clear                     .flowz/q def clearCommand; .flowz/q def planC…
  3.21    span    —                         sed -n '1240,1440p' src/store.ts
  3.22    span    — ↺                       sed -n '160,246p' src/store.ts; sed -n '1130,…
  3.23    dir     planclear applyclear c…   .flowz/q callers planClear; .flowz/q callers …
  3.24    span    —                         sed -n '1,90p;205,275p' test/clear.test.ts; s…
  3.25    span    —                         sed -n '2085,2165p;2215,2260p' src/cli.ts
  3.26    span    — ↺                       Read src/store.ts:1225-1239
  3.28    file    import                    grep -n "^import" src/store.ts | head -20
  3.29    span    — ↺                       sed -n '3,15p' src/store.ts
  3.42    span    —                         sed -n '895,1073p' src/insights.ts
  3.43    span    — ↺                       sed -n '140,161p;700,748p' src/insights.ts
  3.47    span    — ↺                       sed -n '536,549p' src/store.ts; .flowz/q def …
  3.48    dir     —                         sed -n '1,181p' src/result.ts; ls ~/.probez/p…

  `probez round 3.20` shows any one of these calls in full.
```

The reading sits *beside* the measurement and never replaces it: the header still says `outline`,
because that is what the rule reads off these thirteen calls, and the model's `other` is printed as
a disagreement rather than as a correction. Nothing that comes back enters a share, a tally or a
filter — every number probez prints stays derivable from the rounds alone. The answer is kept beside
that project's rounds, so `probez question 276c23b3#3.20` shows it too and asking again runs
nothing; `--again` is what spends.

In the view it is a button on any question, and the sentence then fills the *asked about* column so
a table of them can be read at a glance. Beside it is **copy prompt**, which puts exactly what the
reader would be sent on the clipboard — the same text `--prompt` prints — so you can paste it into
a chat you already have open. It runs nothing and needs no reader, so it is there whether or not one
is configured.

What this costs is worth being exact about, because probez otherwise opens no connection to
anything:

- probez still opens no socket. It runs the command you named, as you, and whatever that command
  talks to it talks to with your credentials. probez holds no API key.
- The command is argv and never goes through a shell.
- It runs when you ask, on the question you asked about. Collecting, analyzing and browsing run
  nothing, and with no `reader.json` there is nothing probez can run at all.
- What is sent is that question's calls — the words searched for, the paths named, the command as it
  ran — and nothing else. No prompts you typed, no assistant text, no tool output.
  `probez explain <id> --prompt` prints exactly what would go and runs nothing, which is also how to
  use this without probez spawning anything; *copy prompt* in the view is the same text on the
  clipboard, to paste wherever you like.

Those calls are still your data, and a shell command can hold a path or a secret you typed. A hosted
model sends them off the machine; a local one does not. That choice is the command in the file.

Any single round opens in full, down to what each tool was given:

```console
$ probez round probez 276c23b3#5.65

  round 276c23b3#5.65 · main · opus-5-5
  140.9K in · 388 out · 1.3s · 0 thinking chars  (14% of context)
  2 new · 662 cached · 140.2K reused
  generated in 4.7s
  session 276c23b3-87b8-49df-a676-77675f581f08 · 2026-10-13T16:27:25.605Z · from 2f04b55

  assistant
    Step 4, verify: tests, no runtime dependencies, and the README examples.

  tools (1)
     1    Bash            21.7s  115 chars
       testing/test × config · reconstruction/locate × config · reconstruction/locate × co…
       command: npm test 2>&1 | grep -E '^# (tests|pass|fail)'; echo "deps:"; npm ls --omit=dev 2>&…
       description: Run tests, check runtime deps, look for a README check
       timeout: 600000
```

A session that filled its window carries the one discontinuity a session file does not announce by
ending. `/clear` starts a new session, so it needs no marking; an auto-compaction keeps the same id
and the same file, drops most of the context, and carries on. Every round says what share of its
model's window its input filled — `995.2K in · 4.6K out · 1.2m  (100% of context)` on the last round
before one — and the round after it opens on a rule naming what was dropped:
`── compacted (auto) · 1.0M → 21.0K · took 2.6m ──`. No block is pasted for it here because the
round after a compaction carries the whole continuation summary as its prompt, and printing one runs
to several hundred lines.

## Clearing what you no longer need

A store grows. Almost all of it is the verbatim copies of the agent's own transcripts kept beside
the rounds — on the machine this was written on, 830 MB of 977 — so trimming those is what actually
gives the disk back.

```console
$ probez clear --before 21d

  would remove everything last active before 2026-10-14:

  probez              2 sessions    146 rounds      5 MB

  1 project touched · 0 removed entirely · 2 sessions · 146 rounds · 5 MB freed

  The agent's own session files are not touched, so `probez collect` brings back
  whatever the agent still has. An imported project does not come back.

  Remove 146 rounds from 1 project? There is no undo. [y/N]
```

**A session is the unit.** One whose last round is older than the window goes entirely, with the
archived transcript beside it; one with any newer round stays whole. So a project you still work in
keeps its recent work and gives up the rest, and a project you have not touched in months goes.
`probez clear --all` takes everything, including projects an older probez collected that this one can
no longer read, which no other command lists; `probez clear <project>` takes one.

**Nothing acts on the first press.** The plan above is printed and then asked about, and with no
terminal to ask on — a pipe, a CI job — it refuses rather than assuming, so `--yes` is how a script
says it means it. The same two operations sit under *Danger zone* in `probez view` → Settings › Data,
where the panel names the largest projects rather than only counting them.

**What is gone is only as recoverable as the agent's own files.** probez has only ever read those,
so `probez collect` brings back whatever the agent still has — and a session cleared from the store
is not remembered as cleared, so an unrestricted collect brings that back too. If what you want is a
store that stays small, `probez collect --since 30d` is the companion: it reads only the sessions
the agent has written to inside a window, and a later collect with no window still picks up the
rest. An imported project does not come back: the file it arrived as is the only other copy.

## Sharing a project

A project can be written to a file and read back on another machine, so a trace can go in a bug
report or a review the way a log does.

```console
$ probez export probez --bundle --out probez.json

  exported  probez  →  ~/probez-demo/probez.json
  616 KB · they read it with `probez import probez.json`
```

```console
$ probez import probez.json

  imported  probez

  sessions   7         rounds   198      tasks  25

  this is somebody else's work, kept apart from anything collected here
  → ~/.probez/projects/probez-16544548/rounds.jsonl
  probez view probez-16544548
```

`--bundle` writes one `.json` carrying the manifest and the analysis around the rounds; without it
you get the store's own `.jsonl`, one round per line, on stdout unless you pass `--out`. Either
imports. The same pair is in the view: **Export** under a project's **⋮**, **Import** at the foot
of the menu.

**`--darken` is how you send one to somebody outside the work.** Prompts and replies are written as
`****`; paths, commands and search terms become tokens; the project's own name goes with them. What
survives is every measurement — rounds, tasks, tokens, cost, timing, errors — and, deliberately, the
shape the analyzer reads: a path still resolves to the same target, a command still classifies as
the same kind of work, and two calls that named the same file still name the same token, so the
categories, the targets and the trails all come out. In the view it is **Darken the export**, a
toggle above the two Export items, since it changes what either one writes rather than being a third
thing to export. It redacts the file and nothing else — the view keeps showing your own work as it
is.

```console
$ probez export probez --bundle --darken --out probez-darkened.json

  exported  darkened  probez  →  ~/probez-demo/probez-darkened.json
  411 KB · they read it with `probez import probez-darkened.json`
```

It cannot be undone: the tokens are one-way and salted per export, so two exports of the same
project share none of them. A project that arrived this way says `darkened` in `probez projects`, in
the header of every read command, and beside its name in the view. Two things it does not do, which
are worth knowing before you rely on it: the counts still describe real work, so a small project's
shape may be recognisable to someone who knows it; and trails come out thinner, because an edge
built from a search term appearing *inside* a file's name cannot survive a one-way token — on this
repo's own store, 101 trails against 146.

An import is kept apart from anything collected here — a hash of the sender's project decides where
it lands, so the same name from two people does not collide, and re-importing replaces rather than
appends. Nothing in a file is executed. But nothing in it is checked either: it says whatever the
sender's agent said, and probez shows it to you as faithfully as it shows your own work. **An export
is unredacted unless it was darkened** — otherwise it holds prompts, shell commands and file paths
exactly as typed. Read one before you send it, and read [SECURITY.md](SECURITY.md) first.

## What you get

One JSON object per LLM round, appended to `~/.probez/projects/<project>/rounds.jsonl`:

```json
{
  "session": "276c23b3-87b8-49df-a676-77675f581f08",
  "round": 25, "task": 3, "commit": "a6a209031990c6fa848742ff393dd6ca12f15db3",
  "agent": "main", "source": "claude-code",
  "id": "msg_011CfzVquKfSU9jKzuCP2Rha",
  "ts": "2026-10-13T15:47:40.867Z", "ms": 626, "gen_ms": 10097, "wait_ms": null,
  "first_input": "tool_result",
  "model": "claude-opus-5-5",
  "in_tokens": 100136, "in_uncached": 2, "in_cache_read": 95946,
  "in_cache_write": 4188, "in_cache_write_5m": 0, "in_cache_write_1h": 4188,
  "out_tokens": 833, "compaction": null,
  "mcp_server": null, "mcp_tool": null, "skill": null,
  "user_text": "",
  "text": "Both entry points, the CLI and the view's \"clear the whole store\", go through `planClear(dataDir, { before: null })`, so fixing it there covers both. Next, the CLI's plan printer:",
  "thinking_chars": 0,
  "tools": [
    {"name": "Bash", "id": "toolu_01E2hqVVnhNhTawqvEzh8PG4",
     "input": {"command": "sed -n '2085,2165p;2215,2260p' src/cli.ts",
               "description": "Read printPlan and runClear output"},
     "input_chars": 106, "result_chars": 4609,
     "is_error": false, "error_kind": null, "stderr_chars": 0, "interrupted": false,
     "patch": null,
     "emitted_at": "2026-10-13T15:47:41.493Z", "result_at": "2026-10-13T15:47:41.584Z", "ms": 91}
  ],
  "events": [
    {"type": "tool_result", "ts": "2026-10-13T15:47:31.396Z", "chars": 9905,
     "tool_call_id": "toolu_01R786K8WBEzbCkKkNt7tB5c"},
    {"type": "reasoning", "ts": "2026-10-13T15:47:40.867Z", "chars": 0},
    {"type": "text", "ts": "2026-10-13T15:47:40.870Z", "chars": 179},
    {"type": "tool_call", "ts": "2026-10-13T15:47:41.493Z",
     "tool_call_id": "toolu_01E2hqVVnhNhTawqvEzh8PG4"}
  ]
}
```

Five of those repay a second look:

- **`in_tokens` is the sum of the fields after it**, and the last is usually almost all of it. Cache
  reads bill at a fraction of the rate, so the total alone is a poor guide to what a round cost.
- **`ms` is not how long the round took.** It spans the records the round wrote; `gen_ms` starts
  from the input that prompted it, so it includes the wait before the model said anything.
- **`is_error` is the harness's flag**, meaning the call was accepted — a `Bash` call whose test
  suite fails still comes back `false`. `stderr_chars` and `interrupted` are what actually happened.
- **`commit` is the task's starting point, at full length**, and it is the same on every round of
  the task. It is `null` for a project that is not a git checkout, which is also what a task older
  than the repository's first commit, and a repository neither the reflog nor the commit history
  can be read from, both look like.
- **`darkened` is absent here, and is `true` on every round of a project that arrived darkened** —
  see [Sharing a project](#sharing-a-project). It rides on the round rather than beside it because
  a `.jsonl` export has no manifest to carry it, so the mark survives a file someone cut down by
  hand. Where it is set, the numbers on the round are real and the words are `****` or tokens.

**Not recorded:** reasoning text and tool result bodies, kept as character counts. Tool input
strings over 2,000 characters are cut to the first 200 plus a length marker; object structure and
every file path survives, and `input_chars` carries the size the cut removed.

A verbatim copy of each session file is kept alongside, so nothing is lost if you later want a field
probez does not normalize — and it is what a schema change rebuilds from. It is also where `view`
reads a result body from when you press **Show result**, which is why that works on a project
collected here and not on one that arrived as an export. Collecting every project
on a machine with a year of history took about 305 MB, of which the session copies were 284 MB and
the normalized rounds 30 MB.

Two derived files sit beside the rounds, and both are caches: `analysis.jsonl`, which `analyze`
rebuilds from the rounds every time it runs, and `readings.json`, which holds what a reader answered
about the questions you asked it about. Deleting either loses nothing that cannot be produced again
— though a reading costs a model call to produce, which is why it is kept at all.

## Privacy

**probez sends nothing anywhere, unless you configure a reader and press explain.** No network
calls, no telemetry, no account, no upload path. Everything stays under `~/.probez` on your machine.
The one exception is [explain](#explain-the-same-question-read-back-by-your-own-llm), which runs a
command you name, on a question you name, with that question's calls and nothing else — and which
does not exist until you write the file.

It does read your real work. `rounds.jsonl` holds prompts and assistant messages in full, and tool
inputs including file paths and shell commands. One repository outside the agent's session directory
is looked into too, for the commit each task started from: `.git/logs/HEAD` in the project, read-only
— and, only where that log does not reach back to the task, one run of `git log` in that directory,
as argv with no shell, taking no lock and writing nothing. Nothing is kept from either but the hash,
and a machine with no git installed behaves exactly as it did before. The verbatim session copies
beside it hold more still: the full reasoning text and full tool output the round record leaves out.

Nothing in the store is redacted. A credential typed into a shell command is stored exactly as
typed. The store is written owner-only, and `collect` tightens anything it finds looser. Redaction
exists for one thing and one only — `probez export --darken`, which redacts what *leaves* and never
what is kept, described under [Sharing a project](#sharing-a-project). Treat `~/.probez` with the
same care as the repositories it describes, and read [SECURITY.md](SECURITY.md) before sharing any
of it.

## Contributing

Bug reports, ideas and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how
to run it from source, the release checklist, and the three constraints that shape the codebase.

## License

MIT — see [LICENSE](LICENSE).
