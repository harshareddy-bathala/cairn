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
