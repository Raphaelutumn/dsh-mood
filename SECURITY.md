# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | ✅ |

## Reporting a vulnerability

Mood is a plugin that runs with your environment's permissions — like any DSH
plugin, installing it runs code on your machine. If you find a security issue,
please **do not open a public issue**. Report it privately instead.

Preferred: open a private [security advisory] on GitHub, or email the
maintainer via the repository's contact. Please include:

- a minimal description of the issue
- the affected version / file
- a suggested fix, if you have one

You will receive an acknowledgment, normally within 3 business days, and we
will keep you updated on the fix and release.

## Scope

- Plugin load / install paths (`package.json`, `cordis.patch.yml`, `lib/`)
- Anything that could read files, use credentials, or reach the network beyond
  what the plugin's stated behavior requires

Out of scope: general DSH platform security — report those to the
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) project.

[security advisory]: https://github.com/Raphaelutumn/dsh-mood/security/advisories/new
