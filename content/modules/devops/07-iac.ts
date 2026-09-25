import type { Module } from "@/content/types";

export const iac: Module = {
  slug: "devops-iac",
  trackSlug: "devops",
  phaseSlug: "depth",
  order: 3,
  title: "Infrastructure as code: Terraform & Ansible",
  summary:
    "Everything you clicked together in the console in Month 1, rebuilt as code you can review, version, destroy and recreate in minutes. Terraform provisions the infrastructure; Ansible configures what runs on it. The interview value is less in the syntax than in state — what it is, where it lives, and what happens when reality drifts from it.",
  prereqSlugs: ["devops-aws-core"],
  units: [
    {
      slug: "devops-iac-terraform-basics",
      title: "Terraform building blocks",
      objective:
        "Write providers, resources, data sources, variables, outputs and locals, and explain the init → plan → apply cycle and the dependency graph.",
      estMinutes: 70,
      primer: `Clicking resources together in the AWS console works once, but nobody can review it, repeat it or undo it cleanly. **Infrastructure as code** writes the infrastructure down as files: you commit them, review them in a pull request, and rebuild everything from them in minutes.

**Terraform** is the common tool. You describe the *end state* you want — "a VPC with this range, an instance of this type" — in \`.tf\` files, and Terraform works out what to create, change or delete to get there. The loop:

- \`terraform init\` — download the providers (the plugins that talk to AWS);
- \`terraform plan\` — show exactly what would change;
- \`terraform apply\` — make those changes.

**Variables** make a configuration reusable; **outputs** print useful values, like an instance's IP address.

**You need already:** an AWS account and the AWS core module.`,
      conceptMd: `Terraform is **declarative**: you describe the end state, and it works out the create, update and delete calls to reach it.

\`\`\`hcl
terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}
provider "aws" { region = var.region }

variable "region" {
  type    = string
  default = "ap-south-1"
}
locals { name = "atlas-\${terraform.workspace}" }

data "aws_ami" "ubuntu" {                  # read something that already exists
  most_recent = true
  owners      = ["099720109477"]           # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_instance" "api" {            # something Terraform creates and owns
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
  tags          = { Name = local.name }
}

output "api_ip" { value = aws_instance.api.public_ip }
\`\`\`

- **resource** — created and managed by Terraform. **data** — read-only lookup of something that exists.
- **variables** are inputs, **outputs** are return values, **locals** are named expressions.
- References like \`data.aws_ami.ubuntu.id\` build a **dependency graph**, so Terraform knows the AMI lookup comes first and runs independent resources in parallel. \`depends_on\` is for the rare dependency it cannot see.

**The cycle:** \`terraform init\` downloads providers and configures the backend; \`plan\` compares the configuration with state and the real world and prints the diff (\`+\` create, \`~\` update in place, \`-/+\` **replace**); \`apply\` executes it. **Read the plan.** A \`-/+\` on a database means it will be destroyed and recreated.

**"Why IaC instead of clicking in the console?"** — reviewable in a pull request, reproducible in another region or account, versioned so you can see who changed what, and destroyable and recreatable on demand. The console gives you none of these.`,
      interviewAngle:
        "\"Why IaC?\" and \"what is the difference between a resource and a data source?\" are " +
        "warm-ups. The real test is reading a plan: spotting that a change forces replacement.",
      pitfalls: [
        "Running apply without reading the plan, and missing a `-/+` that replaces a stateful resource.",
        "Hard-coding an AMI ID that differs per region instead of looking it up with a data source.",
        "Not pinning provider versions, so a new major version changes behaviour under you.",
        "Reaching for depends_on when a plain reference would express the dependency.",
      ],
      recall: [
        {
          front: "In Terraform, what is the difference between a resource block and a data block?",
          back: "A resource is created and managed by Terraform; a data source only reads something that already exists.",
        },
        {
          front: "What does `-/+` mean in a terraform plan, and why does it matter?",
          back:
            "The resource will be destroyed and recreated because a changed argument cannot be " +
            "updated in place — for a database or disk, that can mean data loss.",
        },
        {
          front: "Give three reasons for infrastructure as code over clicking in the console.",
          back:
            "Changes are reviewable in PRs, environments are reproducible, history is versioned, " +
            "and the whole thing can be destroyed and recreated on demand.",
        },
      ],
      resources: [
        {
          title: "HashiCorp — What is Infrastructure as Code with Terraform?",
          url: "https://developer.hashicorp.com/terraform/tutorials/aws-get-started/infrastructure-as-code",
          kind: "read",
          minutes: 10,
          whyThisOne:
            "The official first tutorial: what Terraform does and the workflow, before any code.",
          steps: [
            "Read this page for the ideas and the init/plan/apply workflow.",
            "Continue to the next tutorials in the series: [Create infrastructure](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/aws-create) and [Manage infrastructure](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/aws-manage), typing every file yourself.",
            "Run `terraform plan` before every `apply` and read what it says.",
            "Finish with `terraform destroy`.",
          ],
          isPrimary: true,
        },
        {
          title: "HashiCorp — Data sources",
          url: "https://developer.hashicorp.com/terraform/language/data-sources",
          kind: "docs",
          whyThisOne:
            "When to read an existing thing rather than create one, with the AMI lookup as the example.",
        },
      ],
    },
    {
      slug: "devops-iac-state",
      title: "State, locking & drift",
      objective:
        "Explain what Terraform state holds, set up an S3 remote backend with locking, and detect and resolve drift.",
      estMinutes: 75,
      primer: `Terraform keeps a record of what it created and how that maps onto real cloud resources — the **state** file. Every \`plan\` compares three things: your code, the state, and what actually exists.

By default the state is a file on your laptop, which breaks as soon as two people (or a CI pipeline) use the same configuration. So teams keep it in a **remote backend** — usually an S3 bucket — with **locking**, so two applies cannot run at once and corrupt it. State can contain secrets, so the bucket must be private and encrypted.

**Drift** is when someone changes a resource by hand in the console. The next \`plan\` notices the difference; you either bring the code in line or let Terraform put things back.

**You need already:** the Terraform basics unit.`,
      conceptMd: `**State** (\`terraform.tfstate\`) maps each resource in your code to the real object's ID, and records its last known attributes. Without it, Terraform could not tell "create this" from "this already exists".

Three facts about state that interviewers probe:

1. **It contains secrets in plain text** — database passwords, keys. Never commit it; encrypt it at rest.
2. **It must be shared** for a team (or a CI pipeline) to work on the same infrastructure. Local state on one laptop does not scale past one person.
3. **Two applies at once corrupt it** — so it must be **locked**.

**Remote state in S3:**

\`\`\`hcl
terraform {
  backend "s3" {
    bucket       = "atlas-tfstate"
    key          = "prod/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true      # Terraform 1.10+: a lock object in the same bucket
  }
}
\`\`\`

Turn on **bucket versioning** so a bad state write can be undone. For locking, older setups use a **DynamoDB table** (\`dynamodb_table = ...\`); that is still the answer you will hear most in interviews, but HashiCorp has **deprecated DynamoDB locking** in favour of S3-native \`use_lockfile\`. Know both.

**Drift** is when reality no longer matches state — someone changed a security group in the console. \`terraform plan\` refreshes and shows the difference; the next apply **reverts** the manual change. \`terraform plan -refresh-only\` shows drift without proposing to fix it, and \`apply -refresh-only\` accepts reality into state. Then either put the change into code or let Terraform revert it — but decide, do not leave it.

Resources created outside Terraform can be brought under management with an **\`import\` block** (or \`terraform import\`).`,
      interviewAngle:
        "\"Where do you keep state and how do you stop two people applying at once?\" is the most " +
        "common Terraform question. S3 with encryption and versioning, plus locking — and knowing " +
        "DynamoDB locking is now deprecated — is a complete, current answer.",
      pitfalls: [
        "Committing terraform.tfstate to git, secrets included.",
        "Remote state without locking, so a CI apply and a laptop apply race.",
        "Fixing things in the console and being surprised when the next apply reverts them.",
        "Editing the state file by hand instead of using `terraform state` commands or import blocks.",
      ],
      recall: [
        {
          front: "What does Terraform state record, and why can't Terraform work without it?",
          back:
            "The mapping from each resource in code to the real object's ID and attributes. " +
            "Without it Terraform cannot tell what already exists from what to create.",
        },
        {
          front: "Why must Terraform state never be committed to git?",
          back: "It stores sensitive values — passwords, keys — in plain text, and it would be shared without locking.",
        },
        {
          front: "What is Terraform drift, and what does the next apply do about it?",
          back:
            "Real infrastructure changed outside Terraform so it no longer matches state. The next " +
            "apply reverts it to the code unless you update the code or accept it with -refresh-only.",
        },
        {
          front: "How is Terraform state locked on an S3 backend today, and what is the older way?",
          back: "`use_lockfile = true` (S3-native, Terraform 1.10+). The older way, a DynamoDB table, is deprecated.",
        },
      ],
      resources: [
        {
          title: "HashiCorp — State",
          url: "https://developer.hashicorp.com/terraform/language/state",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "Why state exists and what it contains, including the warning about sensitive data.",
          steps: [
            "Read the page, then open your own `terraform.tfstate` and find a resource in it.",
            "Move your state to an S3 backend with locking, following the S3 backend page (next link).",
            "Do the drift tutorial (last link): change something in the console, then run `plan`.",
          ],
          isPrimary: true,
        },
        {
          title: "HashiCorp — S3 backend",
          url: "https://developer.hashicorp.com/terraform/language/backend/s3",
          kind: "docs",
          whyThisOne:
            "Encryption, `use_lockfile`, and the note on the old DynamoDB lock table.",
        },
        {
          title: "HashiCorp — Manage resource drift",
          url: "https://developer.hashicorp.com/terraform/tutorials/state/resource-drift",
          kind: "lab",
          whyThisOne:
            "Cause drift on purpose, then detect and resolve it with `-refresh-only`.",
        },
      ],
    },
    {
      slug: "devops-iac-modules",
      title: "Modules & discipline",
      objective:
        "Factor configuration into modules with inputs and outputs, separate environments, protect stateful resources, and run Terraform from CI.",
      estMinutes: 60,
      primer: `A **module** is a folder of Terraform files that you use like a function: it takes **input variables**, creates some resources, and returns **outputs**. Write a VPC module once and use it for dev and prod with different inputs.

Good habits that come with it:

- keep each **environment** (dev, prod) in its own configuration with its own state, so a mistake in dev cannot touch prod;
- protect resources that hold data — databases, buckets — with \`lifecycle { prevent_destroy = true }\`;
- run \`terraform plan\` in CI on every pull request, so infrastructure changes are reviewed like code.

**You need already:** the Terraform basics and state units.`,
      conceptMd: `A **module** is a directory of \`.tf\` files. The root configuration is a module; calling another is like calling a function — variables are its parameters, outputs its return values:

\`\`\`hcl
module "network" {
  source   = "./modules/network"        # or a registry source with a pinned version
  cidr     = "10.0.0.0/16"
  az_count = 2
}
resource "aws_instance" "api" {
  subnet_id = module.network.private_subnet_ids[0]
}
\`\`\`

Write a module when the same group of resources appears more than once, or when a boundary makes the code easier to reason about (network, compute, data). Do not wrap a single resource in a module just to have modules.

**Environments.** Separate state per environment so a dev apply can never touch prod. The simplest robust layout is one directory per environment (\`envs/dev\`, \`envs/prod\`) calling the same modules with different variables. Workspaces share one backend and one configuration, which makes it easy to apply to the wrong one.

**Discipline that prevents the classic disasters:**

- \`lifecycle { prevent_destroy = true }\` on databases and state buckets — Terraform refuses any plan that would destroy them.
- \`terraform destroy\` in a personal account when you finish a lab. An idle NAT gateway or load balancer is billed by the hour.
- \`terraform fmt -check\` and \`terraform validate\` in CI; post the **plan** on the pull request, and **apply only from CI** after merge, so the reviewed plan is what runs.
- Pin module and provider versions.`,
      interviewAngle:
        "\"How do you manage dev and prod with Terraform?\" and \"how do you stop someone destroying " +
        "the database?\" are where depth shows. Separate state per environment and prevent_destroy " +
        "are the concrete answers.",
      pitfalls: [
        "Using one state for dev and prod, so a dev change can plan against production.",
        "Applying from laptops, so what ran was never reviewed.",
        "Wrapping every single resource in its own module.",
        "Forgetting to destroy lab infrastructure and paying for idle NAT gateways.",
      ],
      recall: [
        {
          front: "What does `lifecycle { prevent_destroy = true }` do?",
          back: "Terraform errors on any plan that would destroy that resource, protecting databases and state buckets.",
        },
        {
          front: "Why keep separate Terraform state per environment?",
          back: "So an apply in dev can never plan changes against prod; the blast radius is one environment.",
        },
        {
          front: "In a Terraform pull-request workflow, where does apply run, and why?",
          back: "In CI after merge, so the plan that was reviewed on the PR is what gets applied — not a laptop's version.",
        },
      ],
      resources: [
        {
          title: "HashiCorp — Modules overview (tutorial)",
          url: "https://developer.hashicorp.com/terraform/tutorials/modules/module",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "What a module is and when to write one, then using a public module.",
          steps: [
            "Read the tutorial and use the public VPC module it shows.",
            "Turn part of your own configuration into a local module with two inputs and one output.",
            "Read *Creating modules* (next link) for how to shape the inputs and outputs.",
            "Add `prevent_destroy` to one resource and watch `destroy` refuse (last link).",
          ],
          isPrimary: true,
        },
        {
          title: "HashiCorp — Creating modules",
          url: "https://developer.hashicorp.com/terraform/language/modules/develop",
          kind: "docs",
          whyThisOne:
            "When to write a module and how to design its inputs and outputs.",
        },
        {
          title: "HashiCorp — The lifecycle meta-argument",
          url: "https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle",
          kind: "docs",
          whyThisOne:
            "`prevent_destroy`, `create_before_destroy` and `ignore_changes`.",
        },
      ],
    },
    {
      slug: "devops-iac-lab",
      title: "Lab: Month 1's AWS, as code",
      objective:
        "Rebuild atlas's Month-1 infrastructure entirely in Terraform — network, security groups, EC2 with an instance role, S3 — then destroy and recreate it.",
      estMinutes: 180,
      primer: `This is a build session, not a reading one. You rebuild atlas's Month 1 infrastructure — the network, the security groups, the EC2 instance with its IAM role, the S3 bucket — entirely in Terraform.

The test of success is simple: run \`terraform destroy\`, then \`terraform apply\`, and everything comes back working, with no clicks in the console.

Work one resource at a time: write it, \`plan\`, \`apply\`, check it in the console, commit. For each resource, the AWS provider documentation shows every argument and an example. If you would rather keep the resources you made by hand, \`import\` brings them under Terraform's control instead of recreating them.

**You need already:** all the earlier Terraform units, and the AWS VPC unit.`,
      conceptMd: `Everything atlas runs on should be created by Terraform, from an empty account, with one \`apply\`.

**Target layout:**

\`\`\`text
infra/
├── bootstrap/          # the state bucket itself (local state, applied once)
├── modules/
│   ├── network/        # VPC, public + private subnets in 2 AZs, IGW, routes
│   └── app/            # SG, IAM role + instance profile, EC2, user_data
└── envs/prod/          # backend "s3", calls both modules, outputs the IP
\`\`\`

**Steps:**

1. **Bootstrap** the state bucket (versioning and encryption on, \`prevent_destroy\`).
2. **Network module**: the VPC you drew in the AWS module — or, to save money, public subnets only and no NAT gateway, with the reason written in the README.
3. **App module**: a security group allowing 443 (and 22 only from your IP, or use SSM Session Manager and open nothing); an **IAM role and instance profile** granting just what atlas needs (read one S3 bucket); an EC2 instance with \`metadata_options { http_tokens = "required" }\` for IMDSv2; \`user_data\` that installs Docker.
4. **S3 bucket** for atlas's uploads or backups, with Block Public Access.
5. **Import** anything from Month 1 you want to keep instead of recreating it.
6. **Prove it**: \`terraform destroy\`, then \`apply\` again, and atlas comes back. Time it and put the number in the README.
7. Add \`fmt\`, \`validate\` and \`plan\` to the CI pipeline.

The destroy-and-recreate step is the point. "I can rebuild production from nothing in 6 minutes" is a sentence very few candidates can say.`,
      interviewAngle:
        "This lab is the evidence behind the resume line \"Terraform-provisioned infrastructure\". " +
        "Expect to be asked to sketch the module layout and to explain one decision you made — the " +
        "NAT gateway trade-off is a good one.",
      pitfalls: [
        "Creating the state bucket inside the configuration that uses it as a backend.",
        "Opening port 22 to 0.0.0.0/0 on the instance.",
        "Attaching AdministratorAccess to the instance role to make things work.",
        "Never testing destroy-and-recreate, so hidden manual steps survive.",
      ],
      recall: [
        {
          front: "Why is the Terraform state bucket created in a separate bootstrap configuration?",
          back:
            "A configuration cannot store its state in a bucket it has not created yet; the " +
            "bootstrap uses local state once, and everything else uses the bucket.",
        },
        {
          front: "What does destroying and re-applying your whole Terraform setup prove?",
          back: "That no manual steps are hidden — the environment really can be rebuilt from code alone.",
        },
      ],
      resources: [
        {
          title: "Terraform Registry — AWS provider documentation",
          url: "https://registry.terraform.io/providers/hashicorp/aws/latest/docs",
          kind: "docs",
          minutes: 180,
          whyThisOne:
            "The reference for every resource in the lab.",
          steps: [
            "Search the left sidebar for each resource as you need it: `aws_vpc`, `aws_subnet`, `aws_security_group`, `aws_iam_role`, `aws_instance`, `aws_s3_bucket`.",
            "For each, start from the page's **Example Usage** and adjust it.",
            "Commit after each working resource.",
            "Finish with `destroy` then `apply`, and check the app still works.",
          ],
          isPrimary: true,
        },
        {
          title: "HashiCorp — Import existing resources",
          url: "https://developer.hashicorp.com/terraform/language/import",
          kind: "docs",
          whyThisOne:
            "Bring Month 1's hand-made resources under Terraform instead of recreating them.",
        },
      ],
    },
    {
      slug: "devops-iac-ansible",
      title: "Ansible, briefly",
      objective:
        "Write an inventory and an idempotent playbook that configures a server, and explain where Ansible fits next to Terraform.",
      estMinutes: 75,
      primer: `Terraform creates servers; **Ansible** configures what runs *on* them — installing packages, writing config files, starting services.

Ansible needs no agent on the server: it connects over SSH and runs small modules. You give it an **inventory** (the list of servers) and a **playbook** (a YAML list of tasks, like "ensure nginx is installed", "ensure this file has this content").

Tasks are written as *desired states*, not commands, so they are **idempotent**: running a playbook twice changes nothing the second time. That is what makes it safe to re-run whenever you like.

The rule of thumb: Terraform for the infrastructure, Ansible for the configuration of the machines — or, increasingly, a container image instead.

**You need already:** SSH, and the Linux module.`,
      conceptMd: `Ansible **configures** machines that already exist: installs packages, writes config files, starts services. It is **agentless** — it connects over SSH and runs small modules with Python on the target.

\`\`\`ini
# inventory.ini
[api]
13.233.10.20 ansible_user=ubuntu
\`\`\`

\`\`\`yaml
# site.yml
- hosts: api
  become: true
  tasks:
    - name: Docker is installed
      ansible.builtin.apt:
        name: docker.io
        state: present
        update_cache: true
    - name: nginx config is in place
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/sites-enabled/atlas
      notify: reload nginx
  handlers:
    - name: reload nginx
      ansible.builtin.service: { name: nginx, state: reloaded }
\`\`\`

**Idempotency** is the core idea: tasks describe a *state* (\`state: present\`), not an action, so running the playbook twice changes nothing the second time and reports \`changed=0\`. A \`shell:\` task that runs \`apt-get install\` is not idempotent in that sense — prefer modules. **Handlers** run once at the end, and only if a task that notifies them changed something.

\`ansible-playbook site.yml --check --diff\` is a dry run that shows what would change.

**Terraform vs Ansible:** Terraform provisions (create the instance, the network, the bucket) and tracks state; Ansible configures the inside of a machine and keeps no state. In a container world much of Ansible's job moves into the Dockerfile — you replace servers rather than reconfigure them (immutable infrastructure) — but Ansible is still common for configuring hosts, and interviewers will ask.

Spend two or three days here, not more.`,
      interviewAngle:
        "\"Terraform or Ansible?\" is the usual question, and \"both — they do different jobs\" " +
        "followed by provisioning versus configuration, and state versus stateless, is the answer.",
      pitfalls: [
        "Using `shell` or `command` for things a module does idempotently.",
        "Thinking Ansible needs an agent on the target — it only needs SSH and Python.",
        "Restarting a service in a task on every run instead of notifying a handler.",
        "Using Ansible to create cloud infrastructure that Terraform should own.",
      ],
      recall: [
        {
          front: "What does idempotent mean for an Ansible playbook, concretely?",
          back: "Running it a second time on an already-configured host changes nothing and reports changed=0.",
        },
        {
          front: "When does an Ansible handler run?",
          back: "Once, at the end of the play, and only if a task that notifies it reported a change.",
        },
        {
          front: "What is the division of labour between Terraform and Ansible?",
          back:
            "Terraform provisions infrastructure and tracks it in state; Ansible configures what " +
            "runs inside machines over SSH, with no state of its own.",
        },
      ],
      resources: [
        {
          title: "Ansible — Getting started",
          url: "https://docs.ansible.com/projects/ansible/latest/getting_started/index.html",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Inventory, a first playbook and the agentless model, in one short path.",
          steps: [
            "Read the introduction, then follow the pages on building an inventory and creating a playbook.",
            "Write a playbook that installs nginx on a test machine or VM.",
            "Run it twice and check that the second run reports no changes.",
            "Read the playbooks page (next link) on handlers.",
          ],
          isPrimary: true,
        },
        {
          title: "Ansible — Playbooks",
          url: "https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html",
          kind: "docs",
          whyThisOne:
            "Tasks, handlers, idempotency and check mode.",
        },
      ],
    },
  ],
};
