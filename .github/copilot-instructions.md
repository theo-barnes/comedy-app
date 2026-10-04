# Copilot Repository Instructions

Use [AGENTS.md](../AGENTS.md) as the mandatory task workflow and
[docs/engineering-playbook.md](../docs/engineering-playbook.md) as the engineering source of
truth. Read the applicable `.github/instructions/*.instructions.md` before modifying matching
files.

Work from the owning feature or backend domain outward. Preserve the existing boundaries and run
the narrowest meaningful validation after a substantive edit. Do not claim a change is complete
without reporting the commands run and their result.

For code review, report only reproducible findings that affect correctness, contracts, security,
reliability, maintainability, or missing behavior tests. Ground each finding in the changed code,
an established repository invariant, or a concrete failing scenario. Do not use review comments
for subjective preferences already covered by formatting tools.
