# Decisio skills

Give Claude Code or Codex the context to run decisio, write typed decision requests and integrate them into your backend.

| Skill | Use it to |
| --- | --- |
| `decisio-setup` | Run on a GPU, with MLX or with Ollama, or connect to an existing endpoint |
| `decisio-request` | Define a choice, yes/no question or rubric, send it and read its answer |
| `decisio-integrate` | Add a decision call, timeout, error handling and review path to an application |

The same self-contained skill folders work in both tools.
They help your coding assistant use decisio inside an application.

## Install

You need Node 22.12 or later and Git for the installer. No npm dependencies are needed.
Clone this repository into a tools directory, then run its installer with your application's path:

```bash
git clone https://github.com/aminry/decisio-skills
cd decisio-skills
node scripts/install.mjs install --host codex --project /path/to/your/app
```

For Claude Code, use `--host claude` instead.
The installer writes to `.agents/skills/` for Codex and `.claude/skills/` for Claude Code in that project.
It refuses to replace unrelated skills.
Use `--skill decisio-request` to install only one workflow.

To install for your user across projects, explicitly select `--scope user`:

```bash
node scripts/install.mjs install --host claude --scope user
```

Choose one scope per host to avoid duplicate listings.
For a manual installation, copy the desired folders from `skills/` into the tool's project or personal skill directory, including their references and assets.
The personal directories are `$HOME/.agents/skills` for Codex and `$HOME/.claude/skills` for Claude Code.

## Use

Start a session in your application and verify that the skills appear in the tool's skill list.
If they do not appear, start a fresh session.

In Codex, mention `$decisio-setup`, `$decisio-request` or `$decisio-integrate`.
In Claude Code, use `/decisio-setup`, `/decisio-request` or `/decisio-integrate`.
You can also ask in ordinary language:

- “Use decisio-setup to connect this project to my server at the configured URL.”
- “Use decisio-request to classify tickets into billing, access or other.”
- “Use decisio-integrate to add this routing decision to my Python backend, with uncertain answers sent for review.”

Say which hardware or endpoint you want to use.
Setup prioritizes GPU, MLX and Ollama; a CPU stand-in is only for development contract tests.
These references target decisio **0.46.0**, and the setup workflow checks the installed version before using its fields.

## Update or uninstall

Review changes, pull the package, then update the host/scope you originally selected:

```bash
git pull --ff-only
node scripts/install.mjs install --host codex --project /path/to/your/app --update
```

The installer checks its owned files before updating.
If you edited a skill locally, preserve your edits first; it refuses to overwrite them.
Extra notes in a managed skill folder stay in place.

```bash
node scripts/install.mjs uninstall --host codex --project /path/to/your/app
```

Uninstall removes only files recorded by this installer, leaving other skills and untracked notes intact.
For manually copied skills, manage their updates and removal yourself.

## Check the package

```bash
npm test
npm run check
```

The tests exercise installation, updates, collisions and removal, plus the bundled HTTP clients against local fixture servers.
Those fixture results verify client behavior; they are not inference or model-quality measurements.
Hardware start commands require the corresponding hardware and model download.

Learn the request format and serving paths in the [decisio documentation](https://opendecisio.com/docs/).
See the [Claude Code skill documentation](https://code.claude.com/docs/en/skills) and [Codex skill documentation](https://learn.chatgpt.com/docs/build-skills) for host discovery behavior.

Apache-2.0. See [LICENSE](LICENSE).
