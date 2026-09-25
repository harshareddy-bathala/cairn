import type { Module } from "@/content/types";

export const awsCore: Module = {
  slug: "devops-aws-core",
  trackSlug: "devops",
  phaseSlug: "depth",
  order: 1,
  title: "AWS core, from memory",
  summary:
    "You hold the certifications, so this is not a tour of the console. It is the three things interviewers make you draw or reason through without docs: how IAM decides allow or deny, a two-AZ VPC with public and private subnets, and the storage and cost facts that separate someone who has run a bill from someone who has read about one.",
  prereqSlugs: ["devops-networking"],
  units: [
    {
      slug: "devops-aws-iam",
      title: "IAM: who can do what",
      objective:
        "Trace an IAM authorization decision through explicit deny, allows and boundaries, and explain why workloads use roles instead of access keys.",
      estMinutes: 70,
      primer: `**IAM** (Identity and Access Management) decides **who can do what** in an AWS account.

- A **user** is a person or program with long-term credentials.
- A **role** is a set of permissions that someone or something *assumes* for a while, receiving short-lived credentials — the right way for servers, CI pipelines and other accounts to get access.
- A **policy** is a JSON document that lists allowed or denied actions (\`s3:GetObject\`) on resources (a particular bucket).

Every request to AWS is checked against the policies that apply. The rules: everything is **denied by default**; an **allow** grants access; and an **explicit deny anywhere always wins**.

The interview favourites: explain that decision order, and why a server should use a role instead of access keys saved on disk.

**You need already:** an AWS account (free tier), and what JSON looks like.`,
      conceptMd: `**Principals** make requests: IAM users (long-lived credentials), **roles** (assumed, temporary credentials from STS), and AWS services. **Policies** are JSON documents of \`Effect\`, \`Action\`, \`Resource\` and optional \`Condition\`.

**How a request is decided** — within one account:

1. Start at **implicit deny**. Nothing is allowed until something allows it.
2. Any applicable **explicit \`Deny\`** wins, anywhere, always.
3. Otherwise an **\`Allow\`** in an identity-based or resource-based policy grants access —
4. — but only within every **guardrail** that applies: Organizations SCPs, permissions boundaries and session policies. These never grant anything; they cap what the other policies can grant.

So "the policy says Allow but it is still denied" has a short list of suspects: an explicit Deny somewhere, an SCP, a permissions boundary, or a condition that did not match.

**Identity-based vs resource-based.** An identity policy is attached to a user or role ("this role may read bucket X"). A resource policy is attached to the resource ("bucket X may be read by role Y") and names a \`Principal\`. Cross-account access needs both sides to agree.

**Roles, not keys.** An EC2 instance gets a role through an **instance profile**; the SDK fetches short-lived credentials from the instance metadata service and rotates them automatically. A GitHub Actions job assumes a role through OIDC (next module). Long-lived access keys on a server or in a repository are the most common way AWS accounts get compromised.

**The root user** has unrestricted access that policies cannot limit (SCPs aside). Turn on MFA, create no access keys for it, and do not use it for daily work.`,
      interviewAngle:
        "\"A role has an Allow for s3:GetObject but gets AccessDenied — what do you check?\" is the " +
        "practical IAM question. Walking the evaluation order (explicit deny, SCP, boundary, " +
        "resource policy, condition) is the answer they are waiting for.",
      pitfalls: [
        "Thinking an Allow can override a Deny. An explicit Deny always wins.",
        "Expecting an SCP or permissions boundary to grant access — they only limit it.",
        "Putting access keys on an EC2 instance instead of attaching a role through an instance profile.",
        "Writing `\"Action\": \"*\", \"Resource\": \"*\"` to get unblocked, and never narrowing it.",
      ],
      recall: [
        {
          front: "In IAM policy evaluation, what beats an explicit Allow?",
          back:
            "An explicit Deny anywhere — and an Allow outside an SCP, permissions boundary or " +
            "session policy that applies, since those cap what can be granted.",
        },
        {
          front: "How does code on an EC2 instance get AWS credentials without an access key?",
          back:
            "The instance has a role attached through an instance profile; the SDK fetches " +
            "temporary credentials from the instance metadata service, which rotates them.",
        },
        {
          front: "What is the difference between an identity-based and a resource-based IAM policy?",
          back:
            "Identity-based is attached to a user or role and says what it may do. Resource-based " +
            "is attached to a resource, like a bucket, and names which principals may use it.",
        },
      ],
      resources: [
        {
          title: "AWS — What is IAM?",
          url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "The official introduction: users, groups, roles and policies, and how they fit together.",
          steps: [
            "Read the page and the sections it links for *users* and *roles*.",
            "In the console, create a role for EC2 with read-only S3 access and read its JSON.",
            "Then read *Policy evaluation logic* (next link) and redraw its flowchart from memory.",
          ],
          isPrimary: true,
        },
        {
          title: "AWS — Policy evaluation logic",
          url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html",
          kind: "docs",
          whyThisOne:
            "The flowchart of the allow/deny decision — the diagram to reproduce in an interview.",
        },
        {
          title: "AWS — IAM roles for Amazon EC2",
          url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html",
          kind: "docs",
          whyThisOne:
            "How an instance gets rotating credentials from a role, so no keys live on the machine.",
        },
      ],
    },
    {
      slug: "devops-aws-vpc",
      title: "A VPC from memory",
      objective:
        "Draw a two-AZ VPC with public and private subnets, route tables, an internet gateway and a NAT gateway, and contrast security groups with network ACLs.",
      estMinutes: 80,
      primer: `A **VPC** (Virtual Private Cloud) is your own private network inside AWS. You choose its address range, for example \`10.0.0.0/16\`.

You divide it into **subnets**, each living in one **Availability Zone** (a separate data centre). A **public subnet** has a route to an **internet gateway**, so things in it can be reached from the internet — load balancers, for example. A **private subnet** has no such route; your app servers and databases live there. When they need to reach *out* (to download updates), they go through a **NAT gateway** sitting in a public subnet.

Traffic is filtered at two levels: **security groups** on each instance (stateful — replies are allowed automatically) and **network ACLs** on each subnet (stateless — both directions need rules).

The standard interview task: draw a VPC across two AZs with public and private subnets.

**You need already:** IP addresses and subnetting from the CN module.`,
      conceptMd: `Draw this until you can do it without looking:

\`\`\`text
VPC 10.0.0.0/16
├── AZ a
│   ├── public  10.0.1.0/24   route 0.0.0.0/0 → IGW     (load balancer, NAT gateway)
│   └── private 10.0.11.0/24  route 0.0.0.0/0 → NAT     (app servers, database)
└── AZ b
    ├── public  10.0.2.0/24   route 0.0.0.0/0 → IGW
    └── private 10.0.12.0/24  route 0.0.0.0/0 → NAT
\`\`\`

- A subnet lives in **one AZ**. High availability means one subnet per tier per AZ.
- **"Public" is a property of the route table**, not the subnet: a subnet is public when its route table sends \`0.0.0.0/0\` to an **internet gateway**. Instances there also need a public IP.
- A **NAT gateway** sits in a *public* subnet and lets *private* instances start outbound connections (package updates, external APIs) while nothing can connect in. It is billed per hour and per GB — a common surprise on a student bill. One per AZ for HA; one total to save money.
- AWS reserves **5 addresses in every subnet** (network, router, DNS, future use, broadcast), so a /24 has 251 usable.

**Security groups vs network ACLs:**

| | Security group | Network ACL |
|---|---|---|
| Attached to | an ENI (instance, LB, RDS) | a subnet |
| Rules | allow only | allow and deny, numbered, first match wins |
| State | **stateful** — return traffic is allowed automatically | **stateless** — return traffic needs its own rule (ephemeral ports 1024–65535) |
| Typical use | the main firewall | a coarse subnet-wide block list |

Security groups can reference **other security groups**: "the database accepts 5432 from the app tier's SG" survives instances being replaced, where an IP rule would not.`,
      interviewAngle:
        "\"Draw a VPC for a web app\" is standard in cloud and SRE interviews. The follow-ups are " +
        "\"what makes a subnet public?\", \"how does a private instance reach the internet?\" and " +
        "\"stateful versus stateless\" — all answered by the drawing.",
      pitfalls: [
        "Saying a subnet is public because of a checkbox. It is public because its route table points 0.0.0.0/0 at an internet gateway.",
        "Putting the NAT gateway in a private subnet — it must be in a public one to reach the IGW.",
        "Forgetting that NACLs are stateless, so a missing outbound ephemeral-port rule silently breaks responses.",
        "Allowing the database from 0.0.0.0/0 instead of from the app tier's security group.",
      ],
      recall: [
        {
          front: "What exactly makes an AWS subnet public?",
          back: "Its route table sends 0.0.0.0/0 to an internet gateway (and instances there need a public IP).",
        },
        {
          front: "Security group or network ACL — which is stateful, and what does that change?",
          back:
            "Security groups are stateful: return traffic is allowed automatically. NACLs are " +
            "stateless, so responses need an explicit rule for the ephemeral port range.",
        },
        {
          front: "How does an instance in a private subnet download packages, and where does that component live?",
          back: "Through a NAT gateway, which sits in a public subnet; the private route table sends 0.0.0.0/0 to it.",
        },
        {
          front: "Why reference a security group instead of an IP range in a database's inbound rule?",
          back: "The rule follows the app tier as instances are replaced or scaled, and it admits nothing else.",
        },
      ],
      resources: [
        {
          title: "AWS — How Amazon VPC works",
          url: "https://docs.aws.amazon.com/vpc/latest/userguide/how-it-works.html",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Subnets, route tables and gateways, with the diagram, on one page.",
          steps: [
            "Read the page, following the diagram piece by piece.",
            "Draw a two-AZ VPC: two public and two private subnets, one internet gateway, a NAT gateway, and each route table.",
            "Read the NAT gateway page (next link) and add its placement to your drawing.",
            "Compare security groups with network ACLs using the last link.",
          ],
          isPrimary: true,
        },
        {
          title: "AWS — NAT gateways",
          url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html",
          kind: "docs",
          whyThisOne:
            "Where a NAT gateway goes, one per AZ for availability, and what it costs.",
        },
        {
          title: "AWS — Network ACLs",
          url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html",
          kind: "docs",
          whyThisOne:
            "Rule ordering, and the ephemeral-port example that shows what stateless costs you.",
        },
      ],
    },
    {
      slug: "devops-aws-compute-storage",
      title: "EC2, EBS, S3 & the billing alarm",
      objective:
        "Pick an instance and volume type with reasons, secure an S3 bucket, require IMDSv2, and set up a billing alarm before anything else.",
      estMinutes: 70,
      primer: `Three services cover most of what you will run.

- **EC2** rents you virtual servers ("instances"). You pick an instance type (CPU and memory), an operating system image, and a network.
- **EBS** is the disk attached to an instance. It persists when the instance stops; \`gp3\` is the sensible default type.
- **S3** stores files ("objects") in "buckets", accessed over HTTP — virtually unlimited, very durable, and the most common place to leak data by accident, so buckets should block public access.

And before you create anything: set a **billing alarm**, so a forgotten instance emails you instead of surprising you at the end of the month.

**You need already:** the IAM and VPC units, and an AWS account.`,
      conceptMd: `**EC2.** Instance families by letter: **t** (burstable, CPU credits — fine for a student API, surprising when credits run out), **m** (general), **c** (compute), **r** (memory). Pick by the bottleneck you measured, not by name.

**EBS** is network-attached block storage, **scoped to one AZ** — a volume cannot attach to an instance in another AZ (copy a snapshot instead). **gp3** is the default choice: 3,000 IOPS and 125 MiB/s baseline regardless of size, with more purchasable separately. **Instance store** is physically attached and fast, and is **lost when the instance stops**.

**S3** is object storage: keys and objects, not a filesystem. Since December 2020 it has **strong read-after-write consistency** for all operations. The security defaults to know:

- **Block Public Access** on at the account level; buckets are private by default.
- Access via IAM and bucket policies, not ACLs (new buckets disable ACLs).
- Versioning plus lifecycle rules to move old versions to cheaper storage classes.

**IMDSv2.** The instance metadata service (\`169.254.169.254\`) hands out the role's credentials. IMDSv1 answers any GET — so a server-side request forgery bug in your app can leak them. **IMDSv2** requires a session token obtained with a PUT, which SSRF usually cannot do. Require it on every instance.

**The billing alarm comes first.** Before launching anything in a personal account:

1. Create an **AWS Budget** with an email alert at, say, 50% and 100% of a small monthly amount; or
2. Create a CloudWatch alarm on the \`EstimatedCharges\` metric — which exists only in **us-east-1**, whatever region you work in.

The classic student bills come from a forgotten NAT gateway, an unattached Elastic IP, or an instance in a region you never look at.`,
      interviewAngle:
        "Cost and security hygiene questions — \"how do you stop a surprise bill?\", \"why IMDSv2?\" — " +
        "are cheap to answer well and show you have run an account, not just passed an exam about one.",
      pitfalls: [
        "Looking for the billing metric in your working region; EstimatedCharges lives only in us-east-1.",
        "Storing data on instance store and losing it on stop.",
        "Trying to attach an EBS volume across AZs.",
        "Leaving IMDSv1 enabled, so one SSRF bug exposes the instance role's credentials.",
      ],
      recall: [
        {
          front: "Why does IMDSv2 protect against SSRF where IMDSv1 does not?",
          back:
            "IMDSv2 needs a session token obtained with a PUT request first; a typical SSRF can only " +
            "make the server issue GETs, which IMDSv1 would answer with credentials.",
        },
        {
          front: "Can an EBS volume be attached to an instance in another Availability Zone?",
          back: "No — EBS volumes are AZ-scoped. Snapshot it and create a new volume in the target AZ.",
        },
        {
          front: "In which region does the CloudWatch EstimatedCharges billing metric live?",
          back: "us-east-1 only, whichever region your resources are in.",
        },
      ],
      resources: [
        {
          title: "AWS — Create a billing alarm",
          url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html",
          kind: "lab",
          minutes: 15,
          whyThisOne:
            "Do this first, before anything else in the module.",
          steps: [
            "Enable billing alerts, then create the alarm — in `us-east-1`, where billing metrics live.",
            "Set the threshold to a small amount, like $5, and confirm the email subscription.",
            "Then launch one small EC2 instance and read the IMDS page (next link) to require IMDSv2 on it.",
            "Terminate the instance when you are done.",
          ],
          isPrimary: true,
        },
        {
          title: "AWS — Use the Instance Metadata Service",
          url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html",
          kind: "docs",
          whyThisOne:
            "IMDSv1 versus IMDSv2, and how to require the token.",
        },
        {
          title: "AWS — Amazon EBS volume types",
          url: "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html",
          kind: "docs",
          whyThisOne:
            "gp3's baseline numbers, and when io2 or st1 are worth paying for.",
        },
      ],
    },
  ],
};
