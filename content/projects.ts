import type { Project } from "./types";

/**
 * The three placement projects.
 *
 * These are the only artefacts an interviewer will actually look at, and the
 * rule that makes them worth looking at is `pledgeNoAi`: hand-typed, zero AI
 * codegen. Cairn itself is AI-built and therefore is deliberately NOT on this
 * list — it is infrastructure for the prep, not evidence in the interview.
 *
 * Each deliverable carries a definition of done written so that "I worked on
 * it" cannot be mistaken for "it is finished".
 */
export const projects: Project[] = [
  {
    slug: "sentinel",
    name: "sentinel",
    phaseSlug: "foundations",
    order: 1,
    summary:
      "A Linux monitoring agent: collects host metrics, evaluates configurable thresholds, alerts, and runs under systemd.",
    resumeLine:
      "Built a Linux monitoring agent in Python that collects host metrics from /proc, evaluates configurable thresholds, emits structured JSON logs and alerts via webhook, packaged as a systemd timer.",
    deliverables: [
      {
        slug: "sentinel-repo",
        title: "Repo, README and metric design",
        definitionOfDone:
          "A stranger can read the README and say what it does and why it exists. The metric list is decided and written down: CPU, memory, disk, uptime, top processes.",
        estMinutes: 90,
      },
      {
        slug: "sentinel-collect",
        title: "collect.py reads real metrics",
        definitionOfDone:
          "Metrics come from /proc and shell commands, not a library that does it for you. You can explain what every field means.",
        estMinutes: 180,
      },
      {
        slug: "sentinel-thresholds",
        title: "Threshold config + alerting",
        definitionOfDone:
          "Thresholds live in a YAML/JSON file, not in the code. Breaching one sends a webhook or email you have actually received.",
        estMinutes: 150,
      },
      {
        slug: "sentinel-logging",
        title: "Structured JSON logging + error-pattern parser",
        definitionOfDone:
          "Every event is one JSON object per line. The parser finds error patterns in a real log file you did not write yourself.",
        estMinutes: 120,
      },
      {
        slug: "sentinel-package",
        title: "systemd timer, install steps, --help",
        definitionOfDone:
          "You wrote the unit file by hand. A clean machine can install and run it from the README alone, and --help is not a lie.",
        estMinutes: 120,
      },
      {
        slug: "sentinel-ship",
        title: "Ship v1.0",
        definitionOfDone:
          "Tagged and pushed, sample output in the README, and a short post about one thing you learned the hard way.",
        estMinutes: 60,
      },
    ],
  },
  {
    slug: "atlas",
    name: "atlas",
    phaseSlug: "depth",
    order: 2,
    summary:
      "A production API on AWS with automated CI/CD, Terraform infrastructure, an SLO, Prometheus alerting and real users.",
    resumeLine:
      "Shipped a production REST API on AWS with Terraform-provisioned infrastructure and GitHub Actions CI/CD, instrumented to a 99.5% availability SLO with Prometheus alerting, serving 30+ real users.",
    deliverables: [
      {
        slug: "atlas-api",
        title: "The API does something a person wants",
        definitionOfDone:
          "A real endpoint solving a real problem, with input validation and error responses you designed. Not a CRUD demo.",
        estMinutes: 300,
      },
      {
        slug: "atlas-terraform",
        title: "Infrastructure as Terraform",
        definitionOfDone:
          "terraform destroy then terraform apply rebuilds the whole environment. Nothing was clicked in the console.",
        estMinutes: 300,
      },
      {
        slug: "atlas-cicd",
        title: "CI/CD that can refuse a deploy",
        definitionOfDone:
          "A pipeline that runs tests, builds an image and deploys — and has actually blocked a bad commit at least once.",
        estMinutes: 240,
      },
      {
        slug: "atlas-observability",
        title: "Prometheus, dashboards and an SLO",
        definitionOfDone:
          "A written 99.5% availability SLO, the error budget it implies, and an alert that has fired for a real incident.",
        estMinutes: 240,
      },
      {
        slug: "atlas-users",
        title: "30+ real users",
        definitionOfDone:
          "Thirty people who are not you have used it. You can say what broke when they did.",
        estMinutes: 180,
      },
      {
        slug: "atlas-runbook",
        title: "A runbook and one rehearsed incident",
        definitionOfDone:
          "Written steps for the three most likely failures, and one of them practised end to end.",
        estMinutes: 120,
      },
    ],
  },
  {
    slug: "atlas-k8s",
    name: "atlas-k8s",
    phaseSlug: "orchestration",
    order: 3,
    summary:
      "Migrating atlas to Kubernetes: rolling updates, probes, autoscaling, and resilience proven by breaking it on purpose.",
    resumeLine:
      "Migrated a production API to Kubernetes with rolling updates, liveness/readiness probes and horizontal autoscaling, validating resilience through deliberate failure injection.",
    deliverables: [
      {
        slug: "k8s-manifests",
        title: "Deployments, services, config and secrets",
        definitionOfDone:
          "Hand-written manifests you can explain line by line. Config and secrets are not baked into the image.",
        estMinutes: 240,
      },
      {
        slug: "k8s-probes",
        title: "Probes that mean something",
        definitionOfDone:
          "Liveness and readiness check different things, and you can say what happens when each one fails.",
        estMinutes: 120,
      },
      {
        slug: "k8s-rolling",
        title: "Rolling update with zero dropped requests",
        definitionOfDone:
          "A deploy under load, measured, with no 5xx. If there were any, you know why.",
        estMinutes: 180,
      },
      {
        slug: "k8s-autoscale",
        title: "Horizontal autoscaling under real load",
        definitionOfDone:
          "A load test makes it scale out and back in. You have the graph.",
        estMinutes: 180,
      },
      {
        slug: "k8s-chaos",
        title: "Break it on purpose",
        definitionOfDone:
          "Kill a pod, a node and a dependency. Write down what happened each time and what you changed afterwards.",
        estMinutes: 180,
      },
    ],
  },
];
