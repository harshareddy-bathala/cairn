import type { Module } from "@/content/types";

const GHA = "https://docs.github.com/en/actions";

export const cicd: Module = {
  slug: "devops-cicd",
  trackSlug: "devops",
  phaseSlug: "depth",
  order: 2,
  title: "CI/CD with GitHub Actions",
  summary:
    "From `git push` to a running container with no human in the loop — and with no long-lived cloud keys anywhere. This is the biggest single jump on the resume this month, and it is what lets you answer \"walk me through your deployment\" by describing something you built rather than something you read about.",
  prereqSlugs: ["devops-git", "devops-docker"],
  units: [
    {
      slug: "devops-cicd-anatomy",
      title: "Workflow anatomy",
      objective:
        "Read and write a workflow: triggers, jobs, steps, runners, needs and conditionals — and know what is shared between steps and what is not.",
      estMinutes: 60,
      conceptMd: `A workflow is a YAML file in \`.github/workflows/\`. Its shape:

\`\`\`yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:
  workflow_dispatch:            # a manual "run" button
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4          # an action: someone else's step
      - run: npm ci && npm test            # a shell command
  build:
    needs: test                            # waits for test; without it, runs in parallel
    if: github.ref == 'refs/heads/main'    # only on main
    runs-on: ubuntu-latest
    steps: [ ... ]
\`\`\`

The facts that cause most confusion:

- **Jobs run in parallel on separate, fresh machines** unless \`needs\` orders them. Nothing on disk survives from one job to the next — pass files with artifacts (next unit).
- **Steps within a job share the machine**: the workspace, installed tools and files written by earlier steps.
- \`uses:\` runs an action; \`run:\` runs a shell command. \`with:\` passes inputs to an action; \`env:\` sets environment variables.
- **Expressions** \`\${{ ... }}\` read contexts such as \`github\`, \`secrets\`, \`matrix\`, \`needs\`, \`steps\`.
- **Triggers matter for security**: \`pull_request\` from a fork runs without your secrets; \`pull_request_target\` runs *with* them against the base branch — dangerous if it checks out and runs the PR's code.

Pin third-party actions to a **full commit SHA**, not just a tag: a tag can be moved to point at malicious code, and a SHA cannot.`,
      interviewAngle:
        "\"What runs where?\" questions — why a file from one job is missing in the next, why two " +
        "jobs ran at once — test whether you have debugged a pipeline or only copied one.",
      pitfalls: [
        "Expecting files from one job to exist in another. Each job is a fresh runner.",
        "Forgetting `needs`, so build and deploy start before the tests finish.",
        "Referencing third-party actions by a movable tag rather than a commit SHA.",
        "Using pull_request_target to run untrusted PR code with access to secrets.",
      ],
      recall: [
        {
          front: "In GitHub Actions, what do two steps in one job share that two jobs do not?",
          back:
            "The runner machine — its workspace, files and installed tools. Separate jobs run on " +
            "fresh runners and share nothing unless you pass artifacts.",
        },
        {
          front: "What does the `needs` keyword change about how jobs run?",
          back: "Without it jobs run in parallel; with it the job waits for the named jobs to succeed.",
        },
        {
          front: "Why pin a third-party action to a commit SHA instead of a version tag?",
          back: "A tag can be re-pointed to different code by whoever controls the repo; a full SHA is immutable.",
        },
      ],
      resources: [
        {
          title: "GitHub — understanding GitHub Actions",
          url: `${GHA}/about-github-actions/understanding-github-actions`,
          kind: "docs",
          minutes: 20,
          whyThisOne: "Workflows, events, jobs, steps and runners, with the diagram of how they nest.",
          isPrimary: true,
        },
        {
          title: "GitHub — workflow syntax",
          url: `${GHA}/writing-workflows/workflow-syntax-for-github-actions`,
          kind: "docs",
          minutes: 20,
          whyThisOne: "The reference to keep open while writing YAML: needs, if, env, permissions.",
        },
        {
          title: "GitHub — events that trigger workflows",
          url: `${GHA}/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows`,
          kind: "docs",
          minutes: 15,
          whyThisOne: "Read the pull_request and pull_request_target sections for the fork-and-secrets rules.",
        },
      ],
    },
    {
      slug: "devops-cicd-matrix-cache",
      title: "Matrix builds, caching & artifacts",
      objective:
        "Fan a job out with a matrix, cache dependencies with a correct key, and pass build outputs between jobs with artifacts.",
      estMinutes: 60,
      conceptMd: `**Matrix.** One job definition, many runs:

\`\`\`yaml
strategy:
  fail-fast: false            # let the other combinations finish when one fails
  matrix:
    python: ["3.11", "3.12"]
    os: [ubuntu-latest]
runs-on: \${{ matrix.os }}
\`\`\`

Use it for versions you actually support. A matrix of six combinations is six runners' worth of minutes.

**Caching** saves re-downloading dependencies. The key must change exactly when the dependencies change — so derive it from the **lockfile**:

\`\`\`yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-\${{ runner.os }}-\${{ hashFiles('**/requirements*.txt') }}
    restore-keys: pip-\${{ runner.os }}-
\`\`\`

A key without the hash never updates (stale dependencies); a key with the commit SHA never hits (no speed-up). Most \`setup-*\` actions (\`setup-node\`, \`setup-python\`) have a built-in \`cache:\` input that does this for you.

**Cache vs artifact — they are not interchangeable:**

| | Cache | Artifact |
|---|---|---|
| Purpose | speed: reuse dependencies across runs | correctness: hand a build output to a later job, or keep it |
| Guarantee | may be missing — the job must work without it | present if the upload succeeded |
| Example | \`~/.npm\`, pip wheels | a built binary, a test report, a coverage file |

Build once, then pass the result with \`upload-artifact\` / \`download-artifact\`. Rebuilding in each job wastes minutes and means the thing you tested is not the thing you ship.`,
      interviewAngle:
        "\"How did you make the pipeline faster?\" is the natural follow-up to describing it. A " +
        "lockfile-hashed cache key and \"build once, promote the artifact\" are the two answers " +
        "worth having.",
      pitfalls: [
        "A cache key that never changes, so dependencies go stale, or one that always changes, so it never hits.",
        "Using a cache to pass a build output to a later job — caches can be evicted.",
        "Rebuilding the image in every job instead of building once and promoting it.",
        "Leaving fail-fast on and losing the results of the other matrix combinations.",
      ],
      recall: [
        {
          front: "What should a dependency cache key be derived from, and why?",
          back: "A hash of the lockfile, so the key changes exactly when dependencies change.",
        },
        {
          front: "Cache or artifact — which do you use to pass a built binary to a deploy job?",
          back: "An artifact. A cache is a best-effort speed-up that may be missing; an artifact is a guaranteed handoff.",
        },
        {
          front: "Why \"build once and promote\" rather than rebuilding in each pipeline stage?",
          back: "So the artifact you tested is byte-for-byte the one you deploy, and minutes are not spent rebuilding.",
        },
      ],
      resources: [
        {
          title: "GitHub — dependency caching",
          url: `${GHA}/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows`,
          kind: "docs",
          minutes: 20,
          whyThisOne: "Keys, restore-keys and the cache-versus-artifact comparison.",
          isPrimary: true,
        },
        {
          title: "GitHub — running variations of jobs (matrix)",
          url: `${GHA}/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow`,
          kind: "docs",
          minutes: 15,
          whyThisOne: "include, exclude and fail-fast, with examples.",
        },
        {
          title: "GitHub — workflow artifacts",
          url: `${GHA}/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow`,
          kind: "docs",
          minutes: 15,
          whyThisOne: "Upload in one job, download in the next — the build-once pattern.",
        },
      ],
    },
    {
      slug: "devops-cicd-oidc",
      title: "Secrets & OIDC to AWS",
      objective:
        "Keep secrets out of logs and forks, scope GITHUB_TOKEN, and deploy to AWS by assuming a role through OIDC with no stored access keys.",
      estMinutes: 75,
      conceptMd: `**Secrets** are encrypted, masked in logs, and **not given to workflows triggered from forks**. They are still visible to anyone who can edit a workflow in the repo, so they are only as safe as your branch protection.

**GITHUB_TOKEN** is created per run. Give it the least it needs:

\`\`\`yaml
permissions:
  contents: read
\`\`\`

**The problem with an AWS access key in secrets:** it never expires, it works from anywhere, and if it leaks you find out from the bill. **OIDC federation** removes it:

1. In AWS, create an **IAM OIDC identity provider** for \`token.actions.githubusercontent.com\`.
2. Create a **role** whose trust policy allows \`sts:AssumeRoleWithWebIdentity\` from that provider, with conditions on the token's claims:

\`\`\`json
"Condition": {
  "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
  "StringLike":   { "token.actions.githubusercontent.com:sub": "repo:you/atlas:ref:refs/heads/main" }
}
\`\`\`

3. In the workflow, allow the job to request a token and assume the role:

\`\`\`yaml
permissions:
  id-token: write
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/atlas-deploy
      aws-region: ap-south-1
\`\`\`

GitHub signs a short-lived token describing the run (repo, branch, environment); AWS checks the signature and the conditions and returns **temporary credentials that expire in about an hour**. Nothing long-lived is stored anywhere.

**The \`sub\` condition is the security.** A trust policy without it — or with \`repo:*\` — lets any GitHub repository assume your role.`,
      interviewAngle:
        "\"How does your pipeline authenticate to AWS?\" — answering \"OIDC, a role trust policy " +
        "scoped to my repo and branch, temporary credentials\" instead of \"an access key in " +
        "secrets\" is one of the strongest signals available to a fresher in a DevOps interview.",
      pitfalls: [
        "Storing a long-lived AWS access key as a repository secret.",
        "A role trust policy with no `sub` condition, or a wildcard, so any repository can assume it.",
        "Forgetting `permissions: id-token: write`, so the job cannot request the OIDC token.",
        "Leaving GITHUB_TOKEN with broad write permissions it does not need.",
      ],
      recall: [
        {
          front: "What does OIDC federation replace in a GitHub Actions deploy to AWS?",
          back:
            "A long-lived access key in secrets. The job exchanges a signed, short-lived GitHub " +
            "token for temporary AWS credentials by assuming a role.",
        },
        {
          front: "In an OIDC role trust policy for GitHub Actions, which claim must you restrict, and why?",
          back:
            "The `sub` claim, to your repo (and branch or environment). Without it, any GitHub " +
            "repository's workflow could assume the role.",
        },
        {
          front: "Which workflow permission lets a job request an OIDC token?",
          back: "`id-token: write`.",
        },
      ],
      resources: [
        {
          title: "GitHub — configuring OpenID Connect in AWS",
          url: `${GHA}/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services`,
          kind: "lab",
          minutes: 40,
          whyThisOne: "The provider, the trust policy and the workflow, end to end — do it for atlas.",
          isPrimary: true,
        },
        {
          title: "aws-actions/configure-aws-credentials",
          url: "https://github.com/aws-actions/configure-aws-credentials",
          kind: "docs",
          minutes: 15,
          whyThisOne: "The action's README, including the recommended trust-policy conditions.",
        },
        {
          title: "GitHub — using secrets in GitHub Actions",
          url: `${GHA}/security-for-github-actions/security-guides/using-secrets-in-github-actions`,
          kind: "docs",
          minutes: 15,
          whyThisOne: "Masking, forks and environments — what secrets do and do not protect.",
        },
      ],
    },
    {
      slug: "devops-cicd-pipeline",
      title: "The full pipeline, and Jenkins",
      objective:
        "Build atlas's pipeline end to end — lint, test, scan, build, push, deploy, smoke test — behind branch protection, and describe the same pipeline in Jenkins terms.",
      estMinutes: 150,
      conceptMd: `The pipeline to build for atlas, in order, each stage gating the next:

1. **Lint and type-check** — seconds, catches the cheap mistakes first.
2. **Unit tests.**
3. **Integration tests** against a real Postgres, using a **service container** in the job.
4. **Security scan** — dependencies (\`pip-audit\`, \`npm audit\`) and the image (Trivy).
5. **Build the image once**, tagged with the **commit SHA** (not only \`latest\`), and push it to a registry (ECR or GHCR).
6. **Deploy** that exact tag — for atlas, pull and restart on EC2.
7. **Smoke test** the live URL (\`/healthz\` returns 200, one real request works). Fail the run, and roll back, if it does not.

Stages 1–4 run on every pull request; 5–7 only on \`main\`.

**Branch protection** makes the pipeline mean something: require a pull request, require the CI checks to pass, block force-pushes to \`main\`. **Environments** add required reviewers or a wait timer before a deploy job runs, and can hold their own secrets.

**Jenkins, conceptually.** Many Indian companies still run it and will ask. The same pipeline as a \`Jenkinsfile\`:

\`\`\`groovy
pipeline {
  agent { docker { image 'python:3.12' } }
  stages {
    stage('Test')  { steps { sh 'pip install -r requirements.txt && pytest' } }
    stage('Build') { when { branch 'main' } steps { sh 'docker build -t atlas:$GIT_COMMIT .' } }
  }
  post { failure { echo 'notify the channel' } }
}
\`\`\`

| GitHub Actions | Jenkins |
|---|---|
| workflow YAML in the repo | \`Jenkinsfile\` (declarative pipeline) in the repo |
| hosted runners, or self-hosted | a **controller** that schedules work on **agents** you run |
| actions from the marketplace | **plugins** installed on the controller |
| managed by GitHub | you patch, back up and secure the controller yourself |

The trade-off to state: Jenkins gives full control and runs anywhere, including air-gapped networks; the cost is operating it.`,
      interviewAngle:
        "\"Walk me through what happens after git push\" is the question this whole module " +
        "prepares. Name each stage, why it is in that order, what tag gets deployed, and how you " +
        "know the deploy worked.",
      pitfalls: [
        "Deploying the `latest` tag, so you cannot tell or roll back to what is running.",
        "No smoke test, so the pipeline goes green while the site is down.",
        "Running deploy steps on pull requests, including from forks.",
        "Branch protection that does not require the CI checks, so a red build can still merge.",
      ],
      recall: [
        {
          front: "Why tag the deployed image with the commit SHA rather than only `latest`?",
          back:
            "It records exactly which code is running, and rolling back means redeploying a " +
            "previous SHA. `latest` is moved by every build.",
        },
        {
          front: "What does a post-deploy smoke test protect against that unit tests cannot?",
          back:
            "A deploy that succeeded mechanically but left the service broken — bad config, a " +
            "missing env var, a failed migration. It checks the live system.",
        },
        {
          front: "In Jenkins, what are the controller and the agents?",
          back:
            "The controller schedules pipelines, holds configuration and plugins; agents are the " +
            "machines that actually execute the stages.",
        },
      ],
      resources: [
        {
          title: "Docker — GitHub Actions for building images",
          url: "https://docs.docker.com/build/ci/github-actions/",
          kind: "lab",
          minutes: 40,
          whyThisOne: "Build and push with caching and SHA tags — the core of stages 5 and 6.",
          isPrimary: true,
        },
        {
          title: "GitHub — about protected branches",
          url: "https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches",
          kind: "docs",
          minutes: 15,
          whyThisOne: "Required checks and reviews — what turns a pipeline into a gate.",
        },
        {
          title: "Jenkins — pipeline syntax",
          url: "https://www.jenkins.io/doc/book/pipeline/syntax/",
          kind: "docs",
          minutes: 25,
          whyThisOne: "Declarative pipeline: agent, stages, steps, when and post — enough to talk about it.",
        },
      ],
    },
    {
      slug: "devops-cicd-deploy-strategies",
      title: "Deployment strategies & rollback",
      objective:
        "Compare recreate, rolling, blue-green, canary and feature flags, and give the rollback for each — including when a database migration is involved.",
      estMinutes: 60,
      conceptMd: `Every strategy answers two questions: **how much of production sees the new version at once**, and **how do you go back**.

| Strategy | How | Rollback | Cost |
|---|---|---|---|
| Recreate | stop old, start new | redeploy old version; downtime both ways | cheapest, has downtime |
| Rolling | replace instances a few at a time | roll forward again with the old version; slow | no extra capacity; two versions live at once |
| Blue-green | run new (green) beside old (blue), switch the load balancer | **switch back** — seconds | double capacity during the switch |
| Canary | send a small share (1–5%) to the new version, watch metrics, widen | route the share back to zero | needs good metrics and traffic splitting |
| Feature flag | ship code dark, turn the feature on per user or percentage | **turn the flag off** — no deploy | flag debt; code paths to test |

**Canary without metrics is just a slow rollout.** The point is an automatic comparison — error rate and latency of the canary against the baseline — that stops the rollout on its own.

**The database is what makes rollback hard.** If version 2 renames a column, version 1 cannot run against the new schema, so "switch back" breaks. The answer is **expand–contract** (parallel change):

1. **Expand**: add the new column; deploy code that writes both and reads the old.
2. Backfill; deploy code that reads the new.
3. **Contract**: only when nothing uses it, drop the old column.

Every step is backward compatible, so any single deploy can be rolled back.

**The interview follow-up is always rollback.** Have a concrete answer for atlas: redeploy the previous image SHA, and you know which one because every deploy is tagged.`,
      interviewAngle:
        "Interviewers ask you to pick a strategy for a scenario and then immediately ask how you " +
        "would roll it back. Blue-green's instant switch and expand–contract for schema changes " +
        "are the two things to bring up unprompted.",
      pitfalls: [
        "Choosing canary without saying which metric decides whether to continue.",
        "Assuming blue-green gives instant rollback when the deploy included a breaking schema change.",
        "Describing rolling deploys without noting two versions serve traffic at the same time.",
        "Leaving feature flags in the code forever after the rollout.",
      ],
      recall: [
        {
          front: "What is the rollback for a blue-green deployment, and what can break it?",
          back:
            "Point the load balancer back at blue — seconds. A schema change that blue cannot run " +
            "against breaks it, which is why migrations must be backward compatible.",
        },
        {
          front: "What is the expand–contract pattern for schema changes?",
          back:
            "Add the new structure, run code that handles both, backfill, switch reads, and only " +
            "then remove the old — so every step can be rolled back.",
        },
        {
          front: "What makes a canary release more than a slow rollout?",
          back: "Comparing the canary's error rate and latency against the baseline, and stopping automatically if it is worse.",
        },
      ],
      resources: [
        {
          title: "AWS — deployment strategies",
          url: "https://docs.aws.amazon.com/whitepapers/latest/overview-deployment-options/deployment-strategies.html",
          kind: "read",
          minutes: 20,
          whyThisOne: "All the strategies side by side, with their rollback and capacity cost.",
          isPrimary: true,
        },
        {
          title: "Martin Fowler — blue-green deployment",
          url: "https://martinfowler.com/bliki/BlueGreenDeployment.html",
          kind: "read",
          minutes: 10,
          whyThisOne: "The original description, including the database problem.",
        },
        {
          title: "Martin Fowler — canary release",
          url: "https://martinfowler.com/bliki/CanaryRelease.html",
          kind: "read",
          minutes: 10,
          whyThisOne: "Canary versus feature flags, and why metrics are the point.",
        },
      ],
    },
  ],
};
