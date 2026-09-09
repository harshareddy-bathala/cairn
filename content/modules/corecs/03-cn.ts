import type { Module } from "@/content/types";

export const cn: Module = {
  slug: "corecs-cn",
  trackSlug: "corecs",
  phaseSlug: "foundations",
  order: 3,
  title: "Computer networks (exam layer)",
  summary:
    "The written-test companion to the SRE networking module. Same material, different question format — subnetting sums, layer tables, protocol definitions. You have a CCNA; this is mostly recall practice.",
  units: [
    {
      slug: "corecs-cn-layers",
      title: "OSI, TCP/IP & encapsulation",
      objective:
        "Place any protocol at its layer and describe what each layer adds to a packet.",
      estMinutes: 60,
      conceptMd: `The OSI seven — Physical, Data Link, Network, Transport, Session, Presentation, Application — versus the practical TCP/IP four: Link, Internet, Transport, Application.

**Encapsulation** is the mental model that makes the layers stick: application data gets a TCP header (segment), then an IP header (packet), then an Ethernet header and trailer (frame). Each layer treats everything above it as opaque payload, and each strips its own header on the way back up.

Protocols by layer, which is exactly how MCQs ask it:
- **L2** — Ethernet, ARP (IP → MAC), switches, MAC addresses
- **L3** — IP, ICMP (which is what ping uses), routers
- **L4** — TCP, UDP, port numbers
- **L7** — HTTP, DNS, SMTP, FTP, SSH

Devices: a **hub** is L1 (repeats to every port), a **switch** is L2 (forwards by MAC), a **router** is L3 (forwards by IP between networks).`,
      resources: [
        {
          title: "GeeksforGeeks — CN last-minute notes",
          url: "https://www.geeksforgeeks.org/last-minute-notes-computer-network/",
          kind: "read",
          minutes: 35,
          whyThisOne: "Exactly the recall format campus written tests use. Pure revision, not learning.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "corecs-cn-subnetting",
      title: "IP addressing & subnetting",
      objective:
        "Solve subnetting problems quickly: network address, broadcast, usable hosts, CIDR.",
      estMinutes: 75,
      conceptMd: `Practise until this is arithmetic rather than thinking — subnetting questions are guaranteed marks.

**CIDR**: \`/24\` means 24 network bits, leaving 8 host bits → 2⁸ = 256 addresses, of which **254 are usable** (the all-zeros network address and the all-ones broadcast address are reserved).

The formula: hosts = 2^(32 − prefix) − 2.

| Prefix | Mask | Addresses | Usable |
|---|---|---|---|
| /24 | 255.255.255.0 | 256 | 254 |
| /25 | 255.255.255.128 | 128 | 126 |
| /26 | 255.255.255.192 | 64 | 62 |
| /27 | 255.255.255.224 | 32 | 30 |
| /30 | 255.255.255.252 | 4 | 2 |

The fast method for "which subnet does 192.168.1.100/26 belong to": the block size is 256 − 192 = 64, so the subnets start at .0, .64, .128, .192. 100 falls in the .64 block → network 192.168.1.64, broadcast 192.168.1.127.

**Private ranges** (RFC 1918), worth memorising: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. **NAT** is what maps these to a public address, and it is why your home devices share one external IP.`,
      resources: [
        {
          title: "subnettingpractice.com",
          url: "https://subnettingpractice.com/",
          kind: "do",
          minutes: 45,
          whyThisOne: "Generates unlimited timed problems. Twenty a day for a week makes this automatic.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "corecs-cn-protocols",
      title: "TCP vs UDP & the application protocols",
      objective:
        "Justify TCP or UDP for a given application, and recall the standard port numbers.",
      estMinutes: 60,
      conceptMd: `**TCP** — connection-oriented, reliable, ordered, flow- and congestion-controlled, 20-byte header. **UDP** — connectionless, unreliable, unordered, 8-byte header, no congestion control.

Choose UDP when **latency matters more than completeness**: live video and voice (a retransmitted frame arrives too late to be useful), DNS queries (one small request, just retry), and gaming. Choose TCP when every byte must arrive: web, email, file transfer.

That "a late packet is worthless" framing is the answer that shows understanding rather than recall.

**Ports to memorise**: 20/21 FTP, 22 SSH, 23 Telnet, 25 SMTP, 53 DNS (both UDP and TCP — TCP for large responses and zone transfers), 80 HTTP, 110 POP3, 143 IMAP, 443 HTTPS, 3306 MySQL, 5432 PostgreSQL, 6379 Redis.

Ranges: 0–1023 well-known (require privilege to bind on Linux — which is exactly why containers often run applications on 8080 and let a proxy own 443), 1024–49151 registered, 49152+ ephemeral.`,
      resources: [
        {
          title: "GeeksforGeeks — TCP vs UDP",
          url: "https://www.geeksforgeeks.org/differences-between-tcp-and-udp/",
          kind: "read",
          minutes: 20,
          whyThisOne: "The comparison table in the exact form MCQs test it.",
          isPrimary: true,
        },
      ],
    },
  ],
};
