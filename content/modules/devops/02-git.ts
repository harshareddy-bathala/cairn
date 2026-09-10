import type { Module } from "@/content/types";

export const git: Module = {
  slug: "devops-git",
  trackSlug: "devops",
  phaseSlug: "foundations",
  order: 2,
  title: "Git, properly",
  summary:
    "You will be asked how to undo a bad commit that is already pushed. Have a real answer, and understand the model well enough that the answer is obviously right rather than memorised.",
  prereqSlugs: ["devops-linux-foundations"],
  units: [
    {
      slug: "devops-git-model",
      title: "The object model: why git behaves the way it does",
      objective:
        "Explain commits, trees, blobs and refs, and why a branch is just a moving pointer.",
      estMinutes: 60,
      conceptMd: `Almost every confusing git behaviour becomes obvious once the model is clear.

A **blob** is file contents. A **tree** maps names to blobs and other trees — a directory. A **commit** points to one tree plus its parent commits, with an author and a message. Everything is content-addressed by SHA, so identical content is stored once.

A **branch is just a file containing a commit SHA.** That is the whole thing. Creating a branch is instant because it writes 41 bytes. \`HEAD\` is a pointer to the current branch (or directly to a commit, which is "detached HEAD").

This explains the three resets. \`--soft\` moves the branch pointer only, leaving your changes staged. \`--mixed\` (the default) moves the pointer and unstages. \`--hard\` moves the pointer and **discards working tree changes** — the only genuinely destructive one.

And it explains \`reflog\`: git records where HEAD has been, so almost nothing is truly lost for about 90 days. \`git reflog\` has recovered more "deleted" work than any other command.`,
      interviewAngle:
        "`What actually is a branch?` sounds trivial and is a real filter. `A file containing a " +
        "commit SHA` is the answer, and every reset and reflog question follows from it.",
      pitfalls: [
        "Describing a branch as a copy of the code. It is a 41-byte file holding one SHA, " +
          "which is why creating one is instant.",
        "Using `reset --hard` as a general undo. It is the only reset that discards " +
          "working-tree changes.",
        "Believing work is gone after a bad reset. `git reflog` records where HEAD has been " +
          "for about 90 days.",
      ],
      recall: [
        {
          front: "Name the three object types and what each holds.",
          back:
            "A blob is file contents; a tree maps names to blobs and other trees (a directory); " +
            "a commit points to one tree plus its parent commits, with author and message. All " +
            "content-addressed by SHA.",
        },
        {
          front: "What is a branch, physically?",
          back:
            "A file containing a single commit SHA. That is why branching is instant, and why " +
            "moving a branch is just rewriting those bytes.",
        },
        {
          front:
            "`reset --soft`, `--mixed` and `--hard` — what does each move and what does each " +
            "destroy?",
          back:
            "All three move the branch pointer. `--soft` leaves changes staged, `--mixed` (the " +
            "default) unstages them but keeps them in the working tree, and `--hard` discards " +
            "working-tree changes — the only destructive one.",
        },
        {
          front: "You reset --hard and lost a commit you needed. What now?",
          back:
            "`git reflog` — git records every position HEAD has held for roughly 90 days, so " +
            "the commit is still reachable by SHA even though no branch points at it.",
        },
      ],
      resources: [
        {
          title: "Pro Git — ch. 10.2, Git Objects",
          url: "https://git-scm.com/book/en/v2/Git-Internals-Git-Objects",
          kind: "read",
          minutes: 35,
          whyThisOne: "Read this once and git stops being a set of memorised incantations. Free, official.",
          isPrimary: true,
        },
        {
          title: "Learn Git Branching",
          url: "https://learngitbranching.js.org/",
          kind: "lab",
          minutes: 60,
          whyThisOne: "Interactive and visual — the fastest way to make rebase stop feeling dangerous.",
        },
      ],
    },
    {
      slug: "devops-git-branching",
      title: "Merge, rebase & interactive rebase",
      objective:
        "Choose between merge and rebase with a stated reason, and clean up a messy branch before review.",
      estMinutes: 75,
      conceptMd: `**Merge** creates a commit with two parents. History is truthful but noisy. **Rebase** replays your commits on top of another branch, producing linear history — but it **rewrites commit SHAs**, creating new commits.

Hence the golden rule: **never rebase commits that other people have pulled.** Rebase your own unpushed work freely; rebase shared history and you force everyone else into a painful reconciliation.

\`git rebase -i HEAD~5\` is the tool for making your work reviewable: \`squash\` combines commits, \`reword\` fixes messages, \`drop\` deletes, and reordering is just moving lines. Cleaning up before opening a pull request is a habit reviewers notice immediately.

\`git cherry-pick <sha>\` copies one commit somewhere else — useful for hotfixes that need to land on both main and a release branch.`,
      interviewAngle:
        "`Merge or rebase?` is a judgement question, not a preference question. The golden rule " +
        "about shared history is the part that has to be in the answer.",
      pitfalls: [
        "Rebasing commits other people have already pulled. Rebase creates new SHAs, so " +
          "everyone else's history diverges from yours.",
        "Treating rebase as `merge but tidier`. It rewrites history, which is a different " +
          "operation with different consequences.",
        "Opening a pull request without cleaning up the branch. `rebase -i` to squash and " +
          "reword is the habit reviewers notice.",
      ],
      recall: [
        {
          front: "State the golden rule of rebasing, and the reason behind it.",
          back:
            "Never rebase commits that other people have pulled. Rebase replays commits as " +
            "*new* commits with new SHAs, so shared history diverges and everyone else has to " +
            "reconcile it painfully.",
        },
        {
          front: "Merge versus rebase — what does each produce?",
          back:
            "Merge creates a commit with two parents: history is truthful but noisy. Rebase " +
            "replays your commits onto the target, producing linear history at the cost of " +
            "rewriting SHAs.",
        },
        {
          front: "What are the three most useful actions in `git rebase -i`?",
          back:
            "`squash` to combine commits, `reword` to fix a message, and `drop` to delete one — " +
            "plus reordering, which is just moving lines in the todo list.",
        },
      ],
      resources: [
        {
          title: "Atlassian — merging vs rebasing",
          url: "https://www.atlassian.com/git/tutorials/merging-vs-rebasing",
          kind: "read",
          minutes: 25,
          whyThisOne: "The clearest statement of the golden rule and why it exists.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "devops-git-undo",
      title: "Undoing things — the interview question",
      objective:
        "Answer 'how do you undo a bad commit that is already pushed?' correctly and without hesitation.",
      estMinutes: 60,
      conceptMd: `This gets asked constantly, and the right answer is a distinction, not a command.

**Not yet pushed** → \`git reset\`. Rewriting local history is free. Use \`--soft\` to keep the changes staged, \`--hard\` to throw them away.

**Already pushed** → \`git revert <sha>\`. It creates a *new* commit that undoes the old one. History stays intact, everyone else's clones stay valid, and the record shows the mistake and the fix — which is the honest engineering answer.

**Already pushed and it was a leaked secret** → reverting is not enough, because the blob is still in history. You must rewrite history (\`git filter-repo\`), force-push, coordinate with everyone, **and rotate the credential** — which is the real fix, since you must assume it is compromised the moment it was pushed.

Volunteering that last case is what separates a good answer from a complete one.`,
      interviewAngle:
        "This is asked constantly, and the complete answer is three cases, not one command. " +
        "Volunteering the leaked-secret case unprompted is what makes it a strong answer.",
      pitfalls: [
        "Answering with a single command. The question is a distinction: pushed or not pushed.",
        "Reverting a leaked secret and stopping there. The blob is still in history — you " +
          "must rewrite history *and* rotate the credential.",
        "Force-pushing a rewritten shared branch without telling anyone.",
      ],
      recall: [
        {
          front: "A bad commit that has NOT been pushed — how do you undo it?",
          back:
            "`git reset`. Rewriting local history is free: `--soft` to keep the changes staged, " +
            "`--hard` to discard them.",
        },
        {
          front: "A bad commit that HAS been pushed — how do you undo it, and why not reset?",
          back:
            "`git revert <sha>`, which creates a new commit undoing the old one. History stays " +
            "intact and everyone else's clones stay valid; a reset plus force-push would " +
            "rewrite history other people already have.",
        },
        {
          front:
            "You pushed a secret. Why is `git revert` not enough, and what is the real fix?",
          back:
            "Revert adds a commit but the blob containing the secret is still in history and " +
            "still fetchable. You must rewrite history (`git filter-repo`), force-push and " +
            "coordinate — and above all rotate the credential, because it must be assumed " +
            "compromised the moment it was pushed.",
        },
      ],
      resources: [
        {
          title: "Pro Git — Undoing Things",
          url: "https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things",
          kind: "read",
          minutes: 25,
          whyThisOne: "Covers reset, revert, amend and checkout in one place with the trade-offs stated.",
          isPrimary: true,
        },
        {
          title: "GitHub — removing sensitive data",
          url: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository",
          kind: "docs",
          whyThisOne: "The leaked-secret case, which is the follow-up that impresses when you raise it first.",
        },
      ],
    },
    {
      slug: "devops-git-workflow",
      title: "Workflow, bisect & review etiquette",
      objective:
        "Find a regression with git bisect, and write commits and pull requests a reviewer will thank you for.",
      estMinutes: 60,
      conceptMd: `\`git bisect\` binary searches your history for the commit that introduced a bug. \`git bisect start\`, \`git bisect bad\`, \`git bisect good <old-sha>\`, then test and mark each step. Over a thousand commits that is about ten tests. With \`git bisect run ./test.sh\` it is fully automatic — genuinely one of the highest-leverage commands in the tool, and almost nobody at your level knows it.

**Commit messages**: a short imperative subject ("Add retry with backoff to the collector"), a blank line, then *why* rather than *what* — the diff already shows what. This directly improves your GitHub profile, which recruiters do read.

**Tags and semver**: \`git tag -a v1.0.0 -m "..."\`, MAJOR.MINOR.PATCH. Tag \`sentinel\` when you ship it; a tagged release reads as finished work rather than an abandoned repo.`,
      interviewAngle:
        "`How would you find which commit broke this?` — answering `git bisect run` with a test " +
        "script is a genuinely differentiating answer at this level.",
      pitfalls: [
        "Reading commits one by one to find a regression. Bisect turns a thousand commits " +
          "into about ten tests.",
        "Marking bisect steps by hand when a script could decide. `git bisect run ./test.sh` " +
          "automates the whole search.",
        "Writing commit messages that restate the diff. The subject says what, the body " +
          "should say why.",
      ],
      recall: [
        {
          front: "What does `git bisect` do, and how many tests does it need over 1000 commits?",
          back:
            "It binary searches history for the commit that introduced a bug — about 10 tests " +
            "for 1000 commits, since each test halves the range.",
        },
        {
          front: "How do you make bisect fully automatic?",
          back:
            "`git bisect run ./test.sh` — the script's exit status marks each revision good or " +
            "bad, so the whole search runs unattended.",
        },
        {
          front: "What shape should a commit message have?",
          back:
            "A short imperative subject line, a blank line, then the body explaining *why* — " +
            "the diff already shows what changed.",
        },
      ],
      resources: [
        {
          title: "git-bisect documentation",
          url: "https://git-scm.com/docs/git-bisect",
          kind: "docs",
          minutes: 20,
          whyThisOne: "Short, and the `bisect run` section is the part worth actually rehearsing.",
          isPrimary: true,
        },
        {
          title: "How to write a git commit message",
          url: "https://cbea.ms/git-commit/",
          kind: "read",
          minutes: 15,
          whyThisOne: "Seven rules, fifteen minutes, and it permanently improves how your repos read.",
        },
      ],
    },
  ],
};
