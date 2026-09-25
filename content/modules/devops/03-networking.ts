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
      primer: `Data crosses a network in small chunks called **packets**, which can arrive late, out of order, or not at all. **TCP** is the layer that turns that unreliable delivery into a dependable two-way stream: it numbers every byte, resends what goes missing, and puts things back in order.

Before any data flows, the two sides agree to talk with a **three-way handshake**: the client says SYN ("let's talk, my numbering starts here"), the server answers SYN-ACK ("fine, and mine starts here"), the client says ACK. Closing takes a similar exchange in each direction.

Each connection is always in a named **state** — \`ESTABLISHED\`, \`TIME_WAIT\`, \`SYN_SENT\` and so on — and \`ss -tan\` shows them on your own machine. Those states are how you tell *where* a failing connection got stuck.

**You need already:** what an IP address and a port are.`,
      conceptMd: `The handshake is SYN → SYN-ACK → ACK, and it exists to synchronise sequence numbers in both directions. Teardown is FIN → ACK → FIN → ACK, because each direction closes independently.

**TIME_WAIT** is the state people ask about. The side that closes first waits 2×MSL (typically 60s) before releasing the port, so that delayed duplicate packets from the old connection cannot be delivered to a new one reusing the same tuple. A server with tens of thousands of sockets in TIME_WAIT usually means it is closing connections rather than the client — often a missing keep-alive.

Diagnostic value of the states: **SYN_SENT** piling up means your SYNs are going unanswered — a firewall dropping silently, or a dead host. **CLOSE_WAIT** piling up means *your application* received a FIN and never called close() — an application bug, a leak, and it will exhaust file descriptors.

Flow control (the receiver's advertised window) protects the *receiver*; congestion control (slow start, congestion avoidance) protects the *network*. Conflating them is a common tell.`,
      interviewAngle:
        "TCP states are asked as a diagnostic question, not a trivia question. `CLOSE_WAIT is " +
        "piling up, so the application is not calling close()` is the kind of sentence that " +
        "ends the topic in your favour.",
      pitfalls: [
        "Conflating flow control with congestion control. The receiver's window protects the " +
          "receiver; slow start protects the network.",
        "Treating TIME_WAIT as a bug. It is correct behaviour on the side that closed first — " +
          "the question is why your server is the one closing.",
        "Blaming the network for CLOSE_WAIT. That state means your own application received a " +
          "FIN and never closed the socket.",
      ],
      recall: [
        {
          front: "What is TIME_WAIT for, and which side ends up in it?",
          back:
            "The side that closes first waits 2x MSL (typically 60s) before releasing the port, " +
            "so delayed duplicates from the old connection cannot be delivered to a new " +
            "connection reusing the same tuple.",
        },
        {
          front: "Thousands of sockets stuck in CLOSE_WAIT. What does that tell you?",
          back:
            "Your application received a FIN and never called close(). It is an application bug " +
            "and a file-descriptor leak — not a network problem.",
        },
        {
          front: "Connections piling up in SYN_SENT — what does that point at?",
          back:
            "Your SYNs are going unanswered: a firewall dropping silently, or a dead host. The " +
            "peer is not refusing (that would be a RST), it is simply not replying.",
        },
        {
          front: "Flow control versus congestion control — what does each protect?",
          back:
            "Flow control is the receiver's advertised window and protects the *receiver* from " +
            "being overrun. Congestion control (slow start, congestion avoidance) protects the " +
            "*network* from being overrun.",
        },
      ],
      resources: [
        {
          title: "High Performance Browser Networking — ch. 2, Building Blocks of TCP",
          url: "https://hpbn.co/building-blocks-of-tcp/",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Free and clear; explains the handshake in terms of what it costs a real request.",
          steps: [
            "Read **Introduction** and **Three-Way Handshake**; draw the three packets with their sequence numbers.",
            "Read **Congestion Avoidance and Control** up to and including **Slow-Start**.",
            "Skip the tuning sections at the end.",
            "Run `ss -tan` and find one connection in each of `ESTAB` and `TIME-WAIT`.",
          ],
          isPrimary: true,
        },
        {
          title: "man 8 ss",
          url: "https://man7.org/linux/man-pages/man8/ss.8.html",
          kind: "lab",
          whyThisOne:
            "The flags for the drill: `ss -tan state time-wait` and friends on your own machine.",
        },
      ],
    },
    {
      slug: "devops-net-dns",
      title: "DNS end to end",
      objective:
        "Trace a name resolution from stub resolver to authoritative server, and debug it with dig.",
      estMinutes: 60,
      primer: `Computers find each other by IP address (like \`142.250.182.14\`), but people use names (like \`google.com\`). **DNS** is the internet's phone book that turns one into the other.

When you open a site, your computer asks a **resolver** (usually run by your ISP or a service like 1.1.1.1). If it does not already know the answer, the resolver asks the **root** servers which servers handle \`.com\`, asks those which servers handle \`google.com\`, and asks *those* for the address. Answers are cached for a set time, the **TTL**, so most lookups are instant.

Different **record types** hold different answers: **A** gives an IPv4 address, **CNAME** says "this name is an alias for that one", **MX** names the mail server. \`dig\` lets you ask any of these questions yourself.

**You need already:** what an IP address is.`,
      conceptMd: `The full path: your stub resolver checks \`/etc/hosts\`, then asks the recursive resolver in \`/etc/resolv.conf\`. If uncached, that resolver walks the hierarchy — root → TLD → authoritative — and caches the answer for its TTL.

Record types worth knowing cold: **A** (IPv4), **AAAA** (IPv6), **CNAME** (alias to another name — and it cannot coexist with other records at the same name, which is why you cannot CNAME a zone apex), **MX** (mail), **TXT** (verification, SPF), **NS** (delegation).

**TTL is the thing that causes incidents.** "DNS propagation" is not propagation at all — it is caches expiring. If you plan to change a record, lower the TTL *well in advance*, or you will be waiting out the old value while users hit the old address.

\`dig +trace example.com\` walks the delegation live, which is usually the fastest way to see where resolution breaks. \`dig @8.8.8.8 example.com\` asks a specific resolver, which distinguishes "the record is wrong" from "my resolver has it cached".`,
      interviewAngle:
        "`DNS propagation` is a phrase that invites a correction, and giving it politely — `it " +
        "is caches expiring, not propagation` — reads as someone who has actually run a " +
        "migration.",
      pitfalls: [
        "Calling it propagation. Nothing propagates; caches expire on their own TTL.",
        "Lowering the TTL at the same time as changing the record. The lowered TTL is itself " +
          "cached, so it has to be lowered well in advance.",
        "Trying to CNAME a zone apex. A CNAME cannot coexist with other records at the same " +
          "name, and the apex must carry SOA and NS.",
      ],
      recall: [
        {
          front: "Walk the full resolution path for a name you have never looked up.",
          back:
            "Stub resolver checks `/etc/hosts`, then asks the recursive resolver from " +
            "`/etc/resolv.conf`. If uncached that resolver walks root, then TLD, then the " +
            "authoritative server, and caches the answer for its TTL.",
        },
        {
          front: "Why can you not put a CNAME at a zone apex?",
          back:
            "A CNAME cannot coexist with any other record at the same name, and the apex must " +
            "carry SOA and NS records.",
        },
        {
          front:
            "You need to change an A record with minimal disruption. What do you do, and when?",
          back:
            "Lower the TTL well in advance — long enough for the *old* TTL to expire everywhere " +
            "— then change the record. Otherwise you spend the old TTL waiting out caches.",
        },
        {
          front:
            "What do `dig +trace` and `dig @8.8.8.8` each tell you that the other does not?",
          back:
            "`+trace` walks the delegation live from the root, showing where resolution breaks. " +
            "`@8.8.8.8` asks one specific resolver, which separates `the record is wrong` from " +
            "`my resolver has a stale copy`.",
        },
      ],
      resources: [
        {
          title: "Cloudflare — What is DNS?",
          url: "https://www.cloudflare.com/learning/dns/what-is-dns/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "The whole lookup explained from zero, with a diagram of each server the question passes through.",
          steps: [
            "Read how a DNS lookup works, following the diagram step by step.",
            "Read the part on the different DNS servers (recursive resolver, root, TLD, authoritative).",
            "Read the part on DNS caching.",
            "Then run `dig google.com` and `dig +trace google.com` and match each step to the diagram.",
          ],
          isPrimary: true,
        },
        {
          title: "Julia Evans — Mess With DNS",
          url: "https://jvns.ca/blog/2021/12/15/mess-with-dns/",
          kind: "lab",
          minutes: 30,
          whyThisOne:
            "A free sandbox where you create real DNS records and watch lookups arrive — the safe way to break DNS.",
        },
        {
          title: "dig(1) manual",
          url: "https://manpages.debian.org/bookworm/bind9-dnsutils/dig.1.en.html",
          kind: "docs",
          whyThisOne:
            "The flags for the drill: `+trace`, `+short`, and asking for a specific record type.",
        },
      ],
    },
    {
      slug: "devops-net-http-tls",
      title: "HTTP & TLS",
      objective:
        "Know the status code families cold and explain what the TLS handshake establishes and why.",
      estMinutes: 75,
      primer: `**HTTP** is the language browsers and servers speak. The browser sends a *request* (a method like \`GET\` or \`POST\`, a path, and headers); the server sends back a *response* with a **status code**, headers and a body.

Status codes come in families you should know by heart: **2xx** it worked, **3xx** look elsewhere (redirect), **4xx** the client made a mistake (404 not found, 403 forbidden), **5xx** the server failed (500 error, 502 bad gateway).

**HTTPS** is HTTP inside **TLS**, which does two jobs: it *encrypts* the traffic so nobody in between can read it, and it *proves the server's identity* with a certificate, so you know you reached the real site. Before any HTTP flows, a **TLS handshake** agrees on keys and checks that certificate.

**You need already:** the TCP unit — TLS runs on top of a TCP connection.`,
      conceptMd: `Status families: **2xx** success, **3xx** redirect, **4xx** the client is wrong, **5xx** the server is wrong. The individual codes that matter operationally: **401** (unauthenticated) vs **403** (authenticated but not permitted) — the distinction is asked; **429** rate limited; **502** bad gateway (your upstream returned garbage); **503** unavailable (usually overload or a deliberate drain); **504** gateway timeout (your upstream did not answer in time). In an incident, 502 vs 504 tells you whether the backend answered badly or not at all.

**HTTP/1.1** is one request at a time per connection, with keep-alive to avoid reconnecting. **HTTP/2** multiplexes many streams over one connection, ending head-of-line blocking at the HTTP layer — though not at the TCP layer, which is exactly why **HTTP/3** moved to QUIC over UDP.

**TLS** establishes three things: identity (the certificate chains to a trusted root), confidentiality (a negotiated symmetric key), and integrity. The expensive asymmetric crypto happens once, to agree the symmetric key. TLS 1.3 cut the handshake to one round trip.

The certificate error you will actually hit: an incomplete **chain**. Your server must send the intermediate certificates, not just the leaf. Browsers often paper over it; \`curl\` does not — which is why \`curl -v\` is the right tool.`,
      interviewAngle:
        "401 versus 403 gets asked directly. 502 versus 504 gets asked as an incident question, " +
        "and knowing which one means `the backend never answered` is the useful half.",
      pitfalls: [
        "Swapping 401 and 403. 401 is unauthenticated (who are you?); 403 is authenticated " +
          "but not permitted.",
        "Serving only the leaf certificate. Browsers often paper over a missing intermediate; " +
          "`curl` does not, and neither do other clients.",
        "Claiming HTTP/2 eliminates head-of-line blocking outright. It removes it at the HTTP " +
          "layer but not at the TCP layer — which is exactly why HTTP/3 moved to QUIC over UDP.",
      ],
      recall: [
        {
          front: "401 versus 403 — what is the distinction?",
          back:
            "401 means unauthenticated: the request carries no valid identity. 403 means " +
            "authenticated but not permitted: we know who you are and the answer is still no.",
        },
        {
          front: "During an incident, what does 502 tell you that 504 does not?",
          back:
            "502 means the upstream answered with something invalid — it responded. 504 means " +
            "the upstream did not answer within the timeout at all. One is a broken backend, " +
            "the other is a hung or overloaded one.",
        },
        {
          front: "What three things does TLS establish, and which part is expensive?",
          back:
            "Identity (the certificate chains to a trusted root), confidentiality (a negotiated " +
            "symmetric key) and integrity. The asymmetric crypto is the expensive part and " +
            "happens once, to agree the symmetric key.",
        },
        {
          front:
            "A certificate works in the browser and fails in curl. What is the usual cause?",
          back:
            "An incomplete chain — the server is sending only the leaf and not the " +
            "intermediates. Browsers often fetch or cache intermediates; other clients do not.",
        },
      ],
      resources: [
        {
          title: "Cloudflare — What happens in a TLS handshake?",
          url: "https://www.cloudflare.com/learning/ssl/what-happens-in-a-tls-handshake/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "The handshake step by step in plain language — what each message carries and why.",
          steps: [
            "Read what a TLS handshake achieves, then its steps in order.",
            "Write the steps from memory in five lines.",
            "Then skim MDN's status codes (next link) and note one example code per family.",
          ],
          isPrimary: true,
        },
        {
          title: "MDN — HTTP response status codes",
          url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status",
          kind: "docs",
          whyThisOne:
            "The reference list. Learn the families, and 200, 301, 304, 400, 401, 403, 404, 429, 500, 502, 503, 504.",
        },
        {
          title: "High Performance Browser Networking — ch. 4, TLS",
          url: "https://hpbn.co/transport-layer-security-tls/",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Deeper: what each round trip costs, session resumption, and the certificate chain of trust.",
        },
      ],
    },
    {
      slug: "devops-net-lb-nginx",
      title: "Load balancing & Nginx by hand",
      objective:
        "Explain L4 vs L7 balancing and configure Nginx as a reverse proxy yourself.",
      estMinutes: 90,
      primer: `One server can only handle so many users. A **load balancer** sits in front of several identical servers and spreads incoming requests across them, so you can add capacity and survive one server dying.

It needs to know which servers are alive, so it sends them regular **health checks** and stops sending traffic to any that fail.

Load balancers work at two levels. **Layer 4** looks only at IP addresses and ports — fast, but blind to what is inside. **Layer 7** understands HTTP, so it can send \`/api\` to one group of servers and \`/images\` to another.

**Nginx** is a common web server that also works as a **reverse proxy**: it receives requests and forwards them to your application running behind it. In this unit you set that up yourself.

**You need already:** HTTP basics from the last unit.`,
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
      interviewAngle:
        "`L4 or L7?` is a design question, and the good answer names what L7 can do that L4 " +
        "cannot. The health-check trade-off is the follow-up worth having ready.",
      pitfalls: [
        "Forgetting `X-Forwarded-For` and `X-Real-IP`. Every request then logs as coming from " +
          "the proxy, and rate limiting by IP silently stops working.",
        "Writing a health check that touches every dependency. One slow dependency then " +
          "removes the entire fleet from rotation.",
        "Assuming L4 can route by path or host. It only sees IP and port.",
      ],
      recall: [
        {
          front: "L4 versus L7 load balancing — what can L7 do that L4 cannot?",
          back:
            "L7 parses HTTP, so it can route on path or host, terminate TLS, retry idempotent " +
            "requests and rewrite headers. L4 balances on IP and port only: faster and " +
            "protocol-agnostic, but blind to content.",
        },
        {
          front: "What is the trade-off in deciding how much a health endpoint should check?",
          back:
            "It should check what a real request needs — a database connection, say — so a " +
            "broken instance is removed. But if it checks too much, one slow shared dependency " +
            "fails every instance at once and drains the whole fleet.",
        },
        {
          front: "Which three headers must a reverse proxy set, and what breaks without them?",
          back:
            "`Host`, `X-Real-IP` and `X-Forwarded-For`. Without them the application sees every " +
            "request as originating from the proxy, so logging, rate limiting and any IP-based " +
            "logic are wrong.",
        },
      ],
      resources: [
        {
          title: "nginx — Beginner's Guide",
          url: "https://nginx.org/en/docs/beginners_guide.html",
          kind: "lab",
          minutes: 40,
          whyThisOne:
            "The official first steps: start nginx, understand its config file, then make it a proxy.",
          steps: [
            "Install nginx and read **Starting, Stopping, and Reloading Configuration**.",
            "Read **Configuration File's Structure**.",
            "Do **Serving Static Content**, then **Setting Up a Simple Proxy Server** on your own machine.",
            "Skip *FastCGI Proxying*.",
          ],
          isPrimary: true,
        },
        {
          title: "Cloudflare — What is load balancing?",
          url: "https://www.cloudflare.com/learning/performance/what-is-load-balancing/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "Why load balancers exist, the common ways they choose a server, and what health checks do.",
        },
        {
          title: "Nginx — Reverse proxy guide",
          url: "https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/",
          kind: "docs",
          whyThisOne:
            "The next step after the beginner's guide: passing headers and buffering in a real proxy config.",
        },
      ],
    },
    {
      slug: "devops-net-trace-drill",
      title: "The drill: browser to database, out loud",
      objective:
        "Narrate the full path of a slow request and name the diagnostic at every hop. Fluently.",
      estMinutes: 60,
      primer: `This unit ties the others together into one interview answer: **"a user says the site is slow — what do you do?"**

A web request passes through a chain of steps: the browser, the DNS lookup, the TCP connection, the TLS handshake, the load balancer, the application server, the database, and the whole way back. Any one of them can be the slow part. A good answer walks the chain in order and names, for each step, *what could go wrong* and *how you would check it*.

\`curl\` can time each step of a real request for you — DNS, connect, TLS, first byte, total — which turns "it's slow" into "the TLS handshake takes 800 ms".

**You need already:** the TCP, DNS, HTTP/TLS and load balancing units.`,
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
      interviewAngle:
        "This *is* the interview: `a user says the site is slow, walk me through it`. The " +
        "answer is a path with a diagnostic at every hop, delivered calmly, and it is worth " +
        "rehearsing out loud until it flows.",
      pitfalls: [
        "Guessing at the layer instead of localising. `curl -w` splits the timing into DNS, " +
          "connect, TLS and first byte — measure before theorising.",
        "Talking about averages. `p99 is up while p50 is flat` says something specific; `it " +
          "is slow` does not.",
        "Stopping at the application. The database — missing index, lock waits, pool " +
          "exhaustion — is where a large share of real slowness lives.",
      ],
      recall: [
        {
          front: "Name the hops from browser to database, in order.",
          back:
            "Browser, DNS, TCP connect, TLS, load balancer, application, database — then back " +
            "out through response size, compression and CDN caching.",
        },
        {
          front: "What does `curl -w` give you that a stopwatch does not?",
          back:
            "A breakdown of where the time actually went — DNS, connect, TLS handshake, time to " +
            "first byte — so you localise the problem to a hop instead of guessing.",
        },
        {
          front: "Why is `p99 up, p50 flat` more useful than `the site is slow`?",
          back:
            "It says most requests are fine and a specific tail is not — pointing at " +
            "contention, a cold cache, one bad instance or a slow dependency, rather than a " +
            "systemic slowdown.",
        },
        {
          front: "Give one diagnostic for each of DNS, TCP and TLS.",
          back:
            "DNS: `dig`, compared against `dig @8.8.8.8`. TCP: `ping` and `traceroute`, or " +
            "`curl -w '%{time_connect}'`. TLS: `curl -v` or `openssl s_client` to inspect the " +
            "chain.",
        },
      ],
      resources: [
        {
          title: "everything curl — Write out (-w)",
          url: "https://everything.curl.dev/usingcurl/verbose/writeout.html",
          kind: "lab",
          minutes: 20,
          whyThisOne:
            "How to make curl print the time spent in each stage of a request.",
          steps: [
            "Read the page and the list of variables.",
            "Build a format string with `time_namelookup`, `time_connect`, `time_appconnect`, `time_starttransfer` and `time_total`.",
            "Run it against three sites and say out loud which stage dominates for each.",
          ],
          isPrimary: true,
        },
        {
          title: "What happens when… (alex/what-happens-when)",
          url: "https://github.com/alex/what-happens-when",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "The full journey of typing a URL and pressing Enter, written as one long answer — a model for your own narration.",
        },
        {
          title: "Google SRE Book — ch. 6, Monitoring distributed systems",
          url: "https://sre.google/sre-book/monitoring-distributed-systems/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Where the four golden signals come from — the vocabulary for describing where a request is slow.",
        },
      ],
    },
  ],
};
