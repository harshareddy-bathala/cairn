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
          title: "AWS — policy evaluation logic",
          url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html",
          kind: "docs",
          minutes: 25,
          whyThisOne: "The flowchart of the decision, which is the diagram to reproduce in an interview.",
          isPrimary: true,
        },
        {
          title: "AWS — security best practices in IAM",
          url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html",
          kind: "docs",
          minutes: 20,
          whyThisOne: "Temporary credentials, least privilege and root-user hygiene — the checklist behind the answers.",
        },
        {
          title: "AWS — IAM roles for Amazon EC2",
          url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html",
          kind: "docs",
          minutes: 15,
          whyThisOne: "How an instance profile delivers rotating credentials, so no keys live on the box.",
        },
      ],
    },
    {
      slug: "devops-aws-vpc",
      title: "A VPC from memory",
      objective:
        "Draw a two-AZ VPC with public and private subnets, route tables, an internet gateway and a NAT gateway, and contrast security groups with network ACLs.",
      estMinutes: 80,
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
          title: "AWS — how Amazon VPC works",
          url: "https://docs.aws.amazon.com/vpc/latest/userguide/how-it-works.html",
          kind: "docs",
          minutes: 25,
          whyThisOne: "Subnets, route tables, gateways and the diagram in one page.",
          isPrimary: true,
        },
        {
          title: "AWS — NAT gateways",
          url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html",
          kind: "docs",
          minutes: 15,
          whyThisOne: "Placement, HA per AZ and pricing — the three things asked about NAT.",
        },
        {
          title: "AWS — network ACLs",
          url: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html",
          kind: "docs",
          minutes: 15,
          whyThisOne: "Rule ordering and the ephemeral-port example that shows what stateless costs you.",
        },
      ],
    },
    {
      slug: "devops-aws-compute-storage",
      title: "EC2, EBS, S3 & the billing alarm",
      objective:
        "Pick an instance and volume type with reasons, secure an S3 bucket, require IMDSv2, and set up a billing alarm before anything else.",
      estMinutes: 70,
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
          title: "AWS — create a billing alarm",
          url: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html",
          kind: "lab",
          minutes: 15,
          whyThisOne: "Do this first, in us-east-1, before anything else in the module.",
          isPrimary: true,
        },
        {
          title: "AWS — use the Instance Metadata Service",
          url: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html",
          kind: "docs",
          minutes: 15,
          whyThisOne: "IMDSv1 versus IMDSv2 and how to require the token.",
        },
        {
          title: "AWS — Amazon EBS volume types",
          url: "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html",
          kind: "docs",
          minutes: 15,
          whyThisOne: "gp3's baseline numbers and when io2 or st1 are worth it.",
        },
      ],
    },
  ],
};
