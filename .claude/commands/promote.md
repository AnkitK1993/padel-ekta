---
description: Push dev and promote it to main (merge + push), then return to dev
---

Promote the current work to production (`main`). Steps:

1. Verify the working tree is clean (`git status --short`). If there are
   uncommitted changes, stop and report them — promote only ships committed work.
2. Confirm the current branch is `dev`. If not, stop and say so.
3. Run, stopping immediately on any failure (never force-push, never `--no-verify`):

   ```
   git push origin dev
   git checkout main
   git merge dev -m "Merge dev: $(git log -1 --format=%s dev)"
   git push origin main
   git checkout dev
   ```

4. Report `git log --oneline -1` for `main` so the promoted commit is visible.

If the merge is rejected (e.g. non-fast-forward / diverged), surface the exact
git error and stop — do not attempt a force-push or rebase without being asked.