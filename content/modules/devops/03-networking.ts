import type { Module } from "@/content/types";

export const networking: Module = {
  slug: "devops-networking",
  trackSlug: "devops",
  phaseSlug: "foundations",
  order: 3,
  title: "Networking for SRE",
  summary:
    "You have CN I, CN II and a CCNA. This module is not about learning networking — it is about re-framing what you already know through the question an SRE interview actually asks: how does a request fail?",
  prereqSlugs: ["devops-linux-foundations"],
  units: [
    {
      slug: "devops-net-tcp",
      title: "TCP: handshake, teardown & the states that page you",
      objective:
        "Explain the three-way handshake, TIME_WAIT, and what a connection stuck in SYN_SENT tells you.",
      estMinutes: 75,
      conceptMd: `The handshake is SYN → SYN-ACK → ACK, and it exists to synchronise sequence numbers in both directions. Teardown is FIN → ACK → FIN → ACK, because each direction closes independently.

**TIME_WAIT** is the state people ask about. The side that closes first waits 2×MSL (typically 60s) before releasing the port, so that delayed duplicate packets from the old connection cannot be delivered to a new one reusing the same tuple. A server with tens of thousands of sockets in TIME_WAIT usually means it is closing connections rather than the client — often a missing keep-alive.

Diagnostic value of the states: **SYN_SENT** piling up means your SYNs are going unanswered — a firewall dropping silently, or a dead host. **CLOSE_WAIT** piling up means *your application* received a FIN and never called close() — an application bug, a leak, and it will exhaust file descriptors.

Flow control (the receiver's advertised window) protects the *receiver*; congestion control (slow start, congestion avoidance) protects the *network*. Conflating them is a common tell.`,
      resources: [
        {
          title: "High Performance Browser Networking — ch. 2, Building Blocks of TCP",
          url: "https://hpbn.co/building-blocks-of-tcp/",
          kind: "read",
          minutes: 45,
          whyThisOne: "Free, authoritative, and framed around performance consequences rather than exam definitions.",
          isPrimary: true,
        },
        {
          title: "ss and netstat state drills",
          url: "https://man7.org/linux/man-pages/man8/ss.8.html",
          kind: "lab",
          minutes: 30,
          whyThisOne: "Run `ss -tan state time-wait` on your own machine — seeing real states beats reading about them.",
        },
      ],
    },
    {
      slug: "devops-net-dns",
      title: "DNS end to end",
      objective:
        "Trace a name resolution from stub resolver to authoritative server, and debug it with dig.",
      estMinutes: 60,
      conceptMd: `The full path: your stub resolver checks \`/etc/hosts\`, then asks the recursive resolver in \`/etc/resolv.conf\`. If uncached, that resolver walks the hierarchy — root → TLD → authoritative — and caches the answer for its TTL.

Record types worth knowing cold: **A** (IPv4), **AAAA** (IPv6), **CNAME** (alias to another name — and it cannot coexist with other records at the same name, which is why you cannot CNAME a zone apex), **MX** (mail), **TXT** (verification, SPF), **NS** (delegation).

**TTL is the thing that causes incidents.** "DNS propagation" is not propagation at all — it is caches expiring. If you plan to change a record, lower the TTL *well in advance*, or you will be waiting out the old value while users hit the old address.

\`dig +trace example.com\` walks the delegation live, which is usually the fastest way to see where resolution breaks. \`dig @8.8.8.8 example.com\` asks a specific resolver, which distinguishes "the record is wrong" from "my resolver has it cached".`,
      resources: [
        {
          title: "Julia Evans — How DNS works / dig",
          url: "https://jvns.ca/blog/2021/12/15/mess-with-dns/",
          kind: "read",
          minutes: 30,
          whyThisOne: "Hands-on and unusually clear; the companion sandbox lets you break real DNS safely.",
          isPrimary: true,
        },
        {
          title: "dig +trace drills",
          url: "https://manpages.debian.org/bookworm/bind9-dnsutils/dig.1.en.html",
          kind: "lab",
          minutes: 25,
          whyThisOne: "The flag reference for the drill: trace three domains you use, and the delegation chain stops being abstract.",
        },
      ],
    },
    {
      slug: "devops-net-http-tls",
      title: "HTTP & TLS",
      objective:
        "Know the status code families cold and explain what the TLS handshake establishes and why.",
      estMinutes: 75,
      conceptMd: `Status families: **2xx** success, **3xx** redirect, **4xx** the client is wrong, **5xx** the server is wrong. The individual codes that matter operationally: **401** (unauthenticated) vs **403** (authenticated but not permitted) — the distinction is asked; **429** rate limited; **502** bad gateway (your upstream returned garbage); **503** unavailable (usually overload or a deliberate drain); **504** gateway timeout (your upstream did not answer in time). In an incident, 502 vs 504 tells you whether the backend answered badly or not at all.

**HTTP/1.1** is one request at a time per connection, with keep-alive to avoid reconnecting. **HTTP/2** multiplexes many streams over one connection, ending head-of-line blocking at the HTTP layer — though not at the TCP layer, which is exactly why **HTTP/3** moved to QUIC over UDP.

**TLS** establishes three things: identity (the certificate chains to a trusted root), confidentiality (a negotiated symmetric key), and integrity. The expensive asymmetric crypto happens once, to agree the symmetric key. TLS 1.3 cut the handshake to one round trip.

The certificate error you will actually hit: an incomplete **chain**. Your server must send the intermediate certificates, not just the leaf. Browsers often paper over it; \`curl\` does not — which is why \`curl -v\` is the right tool.`,
      resources: [
        {
          title: "High Performance Browser Networking — ch. 4, Transport Layer Security",
          url: "https://hpbn.co/transport-layer-security-tls/",
          kind: "read",
          minutes: 40,
          whyThisOne: "Explains the handshake in terms of what each round trip costs, which is how an SRE should hold it.",
          isPrimary: true,
        },
        {
          title: "MDN — HTTP response status codes",
          url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status",
          kind: "docs",
          whyThisOne: "The reference to skim until the families are automatic.",
        },
      ],
    },
    {
      slug: "devops-net-lb-nginx",
      title: "Load balancing & Nginx by hand",
      objective:
        "Explain L4 vs L7 balancing and configure Nginx as a reverse proxy yourself.",
      estMinutes: 90,
      conceptMd: `**L4** balances on IP and port — fast, protocol-agnostic, but it cannot see paths or headers. **L7** parses HTTP, so it can route on path or host, terminate TLS, retry idempotent requests and rewrite headers. AWS ALB is L7; NLB is L4.

**Health checks** are what make a load balancer useful: passive (mark a backend down after failures) and active (poll a health endpoint). Your health endpoint should check the things a request actually needs — a database connection, say — but not so much that a slow dependency takes the whole fleet out of rotation. That trade-off is a good interview answer.

Configure this yourself rather than reading about it:

\`\`\`nginx
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
\`\`\`

Forgetting those headers means your application logs every request as coming from the proxy. Debugging that once teaches it permanently.`,
      resources: [
        {
          title: "Nginx — reverse proxy guide",
          url: "https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/",
          kind: "docs",
          minutes: 30,
          whyThisOne: "Official and short. Do the config on your own machine, do not just read it.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "devops-net-trace-drill",
      title: "The drill: browser to database, out loud",
      objective:
        "Narrate the full path of a slow request and name the diagnostic at every hop. Fluently.",
      estMinutes: 60,
      conceptMd: `**The diagnostic question, not the factual one.** Not "do you know TCP" but "a user says the site is slow — walk me through it." Rehearse it out loud until it flows.

The path, with what could break and how you would check:

1. **Browser** — cache, JS execution. → devtools waterfall
2. **DNS** — resolution slow or stale. → \`dig\`, compare against \`dig @8.8.8.8\`
3. **TCP connect** — SYN dropped, RTT high. → \`ping\`, \`traceroute\`, \`curl -w '%{time_connect}'\`
4. **TLS** — handshake cost, chain problems. → \`curl -v\`, \`openssl s_client\`
5. **Load balancer** — a backend out of rotation, queueing. → LB metrics, target health
6. **Application** — slow handler, lock contention, GC. → latency percentiles, traces
7. **Database** — missing index, lock waits, connection pool exhausted. → \`EXPLAIN\`, slow query log, pool metrics
8. **Back through the layers** — response size, compression, CDN caching

Two things elevate the answer: use \`curl -w\` to split the timing into DNS / connect / TLS / first-byte so you can *localise* rather than guess, and talk in **percentiles** — "p99 is up while p50 is flat" means something specific and much more interesting than "it is slow".`,
      resources: [
        {
          title: "curl timing breakdown with -w",
          url: "https://curl.se/docs/manpage.html#-w",
          kind: "lab",
          minutes: 25,
          whyThisOne: "Build the timing format string once, keep it forever. It turns a vague complaint into a number.",
          isPrimary: true,
        },
        {
          title: "Google SRE Book — ch. 6, Monitoring Distributed Systems",
          url: "https://sre.google/sre-book/monitoring-distributed-systems/",
          kind: "read",
          minutes: 40,
          whyThisOne: "Where the four golden signals come from, and it gives you the vocabulary to narrate this well.",
        },
      ],
    },
  ],
};
