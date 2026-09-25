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
      primer: `Networking is split into **layers**, each solving one problem and relying on the layer below it. Separating them lets, say, Wi-Fi be swapped for Ethernet without changing your browser.

The **OSI model** names seven layers: Physical, Data Link, Network, Transport, Session, Presentation, Application. The internet actually runs on the simpler **TCP/IP model** of four: Link, Internet (IP), Transport (TCP/UDP), Application (HTTP, DNS…).

As data goes down the layers to be sent, each one wraps it in its own **header** — the application's data goes inside a TCP segment, inside an IP packet, inside an Ethernet frame. That wrapping is **encapsulation**, and the receiver unwraps it layer by layer.

Exams ask you to name the layer of a protocol or device, and what each layer adds.

**You need already:** nothing. You know much of this from CCNA; this unit is recall practice.`,
      conceptMd: `The OSI seven — Physical, Data Link, Network, Transport, Session, Presentation, Application — versus the practical TCP/IP four: Link, Internet, Transport, Application.

**Encapsulation** is the mental model that makes the layers stick: application data gets a TCP header (segment), then an IP header (packet), then an Ethernet header and trailer (frame). Each layer treats everything above it as opaque payload, and each strips its own header on the way back up.

Protocols by layer, which is exactly how MCQs ask it:
- **L2** — Ethernet, ARP (IP → MAC), switches, MAC addresses
- **L3** — IP, ICMP (which is what ping uses), routers
- **L4** — TCP, UDP, port numbers
- **L7** — HTTP, DNS, SMTP, FTP, SSH

Devices: a **hub** is L1 (repeats to every port), a **switch** is L2 (forwards by MAC), a **router** is L3 (forwards by IP between networks).`,
      interviewAngle:
        "MCQs ask this as `which layer does X live at`. Encapsulation is the model that makes " +
        "the whole table recallable instead of memorised.",
      pitfalls: [
        "Placing ARP at L3 because it deals with IP addresses. It maps IP to MAC and operates " +
          "at L2.",
        "Calling ICMP a transport protocol. It is L3 — it is what ping uses, and it has no " +
          "ports.",
        "Mixing up hub, switch and router. L1 repeats, L2 forwards by MAC, L3 forwards by IP " +
          "between networks.",
      ],
      recall: [
        {
          front: "Describe encapsulation from application data down to the wire.",
          back:
            "Application data gets a TCP header to become a segment, then an IP header to " +
            "become a packet, then an Ethernet header and trailer to become a frame. Each layer " +
            "treats everything above it as opaque payload and strips its own header on the way " +
            "back up.",
        },
        {
          front: "Place ARP, ICMP, TCP and HTTP at their layers.",
          back:
            "ARP is L2 (maps IP to MAC), ICMP is L3 (what ping uses), TCP is L4, HTTP is L7.",
        },
        {
          front: "Hub, switch, router — what layer is each and what does it forward on?",
          back:
            "A hub is L1 and repeats to every port. A switch is L2 and forwards by MAC address. " +
            "A router is L3 and forwards by IP address, between networks.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Layers of the OSI model",
          url: "https://www.geeksforgeeks.org/computer-networks/open-systems-interconnection-model-osi/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Each layer's job, its data unit, and example protocols and devices — the table exams are built from.",
          steps: [
            "Read each layer and fill in a table: layer, job, data unit, example protocols, example device.",
            "Then read the TCP/IP model (next link) and map its four layers onto the seven.",
            "Close both and redraw the table from memory.",
          ],
          isPrimary: true,
        },
        {
          title: "GeeksforGeeks — TCP/IP model",
          url: "https://www.geeksforgeeks.org/computer-networks/tcp-ip-model/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "The four-layer model the internet actually uses, and how it lines up with OSI.",
        },
      ],
    },
    {
      slug: "corecs-cn-subnetting",
      title: "IP addressing & subnetting",
      objective:
        "Solve subnetting problems quickly: network address, broadcast, usable hosts, CIDR.",
      estMinutes: 75,
      primer: `An IPv4 address is 32 bits, written as four numbers: \`192.168.1.10\`. Part of it identifies the **network**, the rest identifies the **host** (the device) on that network.

The **prefix** says where the split is: \`/24\` means the first 24 bits are the network, leaving 8 bits for hosts — 2⁸ = 256 addresses. Two of those are reserved: the first is the network's own address and the last is the **broadcast** address, so 254 are usable by devices.

**Subnetting** splits one network into smaller ones by moving that line to the right. Exam questions give an address and a prefix and ask for the network address, the broadcast address, the usable range and the number of hosts. It becomes pure arithmetic with practice — guaranteed marks.

**You need already:** converting small numbers to binary (see the bits unit in DSA).`,
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
      interviewAngle:
        "Guaranteed marks in a written test, and the only way to lose them is to be slow. Drill " +
        "the block-size method until it is arithmetic.",
      pitfalls: [
        "Forgetting to subtract 2. The all-zeros network address and all-ones broadcast " +
          "address are not usable hosts.",
        "Computing the subnet by long division. The block-size method — 256 minus the last " +
          "mask octet — is far faster.",
        "Applying the minus-2 rule to a /31 point-to-point link, where it does not hold.",
      ],
      recall: [
        {
          front: "How many usable hosts does a /26 give, and what is the formula?",
          back:
            "62. Hosts = 2^(32 − prefix) − 2, so 2^6 − 2 — the two reserved addresses being the " +
            "network address and the broadcast address.",
        },
        {
          front: "Which subnet does 192.168.1.100/26 belong to? Show the method.",
          back:
            "Block size = 256 − 192 = 64, so subnets start at .0, .64, .128, .192. 100 falls in " +
            "the .64 block: network 192.168.1.64, broadcast 192.168.1.127.",
        },
        {
          front: "Name the three RFC 1918 private ranges.",
          back:
            "10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. NAT is what maps them onto a public " +
            "address.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — Introduction to subnetting",
          url: "https://www.geeksforgeeks.org/computer-networks/introduction-to-subnetting/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Network and host bits, the subnet mask, and a worked example of splitting a network.",
          steps: [
            "Read the page and redo each worked example on paper, in binary.",
            "Then do 20 timed questions on subnettingpractice.com (next link).",
            "Repeat the 20 questions daily for a week.",
          ],
          isPrimary: true,
        },
        {
          title: "subnettingpractice.com",
          url: "https://subnettingpractice.com/",
          kind: "do",
          whyThisOne:
            "Unlimited generated problems with answers. Twenty a day for a week makes this automatic.",
        },
      ],
    },
    {
      slug: "corecs-cn-protocols",
      title: "TCP vs UDP & the application protocols",
      objective:
        "Justify TCP or UDP for a given application, and recall the standard port numbers.",
      estMinutes: 60,
      primer: `Both **TCP** and **UDP** carry data between programs, identified by **port numbers** (a web server listens on 443, SSH on 22). They make opposite trade-offs:

- **TCP** sets up a connection first and guarantees that everything arrives, in order, with nothing duplicated. That costs time: a handshake, acknowledgements, resends.
- **UDP** just sends each packet and hopes. No connection, no guarantees — but nothing to wait for.

So TCP suits anything that must be complete: web pages, file transfer, email. UDP suits anything where late data is useless anyway: live video, voice calls, games, and small quick lookups like DNS.

On top of them sit the **application protocols** you use daily — HTTP, DNS, SMTP, FTP, SSH — each with a standard port worth knowing.

**You need already:** the layers unit.`,
      conceptMd: `**TCP** — connection-oriented, reliable, ordered, flow- and congestion-controlled, 20-byte header. **UDP** — connectionless, unreliable, unordered, 8-byte header, no congestion control.

Choose UDP when **latency matters more than completeness**: live video and voice (a retransmitted frame arrives too late to be useful), DNS queries (one small request, just retry), and gaming. Choose TCP when every byte must arrive: web, email, file transfer.

That "a late packet is worthless" framing is the answer that shows understanding rather than recall.

**Ports to memorise**: 20/21 FTP, 22 SSH, 23 Telnet, 25 SMTP, 53 DNS (both UDP and TCP — TCP for large responses and zone transfers), 80 HTTP, 110 POP3, 143 IMAP, 443 HTTPS, 3306 MySQL, 5432 PostgreSQL, 6379 Redis.

Ranges: 0–1023 well-known (require privilege to bind on Linux — which is exactly why containers often run applications on 8080 and let a proxy own 443), 1024–49151 registered, 49152+ ephemeral.`,
      interviewAngle:
        "`TCP or UDP for video calls?` — the answer that shows understanding is `a " +
        "retransmitted frame arrives too late to be useful`, not a list of features.",
      pitfalls: [
        "Answering the TCP-or-UDP question with a feature list. The framing that lands is " +
          "whether a late packet still has value.",
        "Assuming DNS is UDP only. It uses TCP for large responses and zone transfers.",
        "Forgetting why ports below 1024 need privilege — which is exactly why containerised " +
          "apps listen on 8080 and let a proxy own 443.",
      ],
      recall: [
        {
          front: "Why is UDP the right choice for live voice and video?",
          back:
            "Because a retransmitted frame arrives too late to be played. Latency matters more " +
            "than completeness, so there is no value in TCP's reliability and ordering " +
            "guarantees.",
        },
        {
          front: "Give the port numbers for SSH, DNS, HTTPS and PostgreSQL.",
          back:
            "22, 53, 443 and 5432. DNS uses both UDP and TCP — TCP for large responses and zone " +
            "transfers.",
        },
        {
          front:
            "What are the three port ranges, and why does the first one matter in practice?",
          back:
            "0-1023 well-known, 1024-49151 registered, 49152+ ephemeral. Binding below 1024 " +
            "requires privilege on Linux, which is why containerised applications listen on " +
            "8080 and let a proxy own 443.",
        },
      ],
      resources: [
        {
          title: "GeeksforGeeks — TCP vs UDP",
          url: "https://www.geeksforgeeks.org/computer-networks/differences-between-tcp-and-udp/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "The comparison table in the exact form MCQs test it.",
          steps: [
            "Read the comparison and write four applications for each protocol, with the reason.",
            "Then read *Protocols in Application Layer* (next link) and list each protocol with its port.",
          ],
          isPrimary: true,
        },
        {
          title: "GeeksforGeeks — Protocols in the application layer",
          url: "https://www.geeksforgeeks.org/computer-networks/protocols-application-layer/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "HTTP, DNS, SMTP, FTP, SSH and the rest in one place, with their ports.",
        },
      ],
    },
  ],
};
