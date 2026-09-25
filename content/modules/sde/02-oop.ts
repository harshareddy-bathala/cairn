import type { Module } from "@/content/types";

export const oop: Module = {
  slug: "sde-oop",
  trackSlug: "sde",
  phaseSlug: "foundations",
  order: 2,
  title: "OOP & design principles",
  summary:
    "The four pillars are asked in nearly every interview and almost everyone answers them with definitions. Answer with code you wrote and a trade-off you can defend, and you are immediately in a different band.",
  prereqSlugs: ["sde-cpp-internals"],
  units: [
    {
      slug: "sde-oop-pillars",
      title: "The four pillars, with your own code",
      objective:
        "Give a concrete example of each pillar from code you wrote, not a textbook definition.",
      estMinutes: 75,
      primer: `**Object-oriented programming** organises code around *objects* that bundle data with the functions that work on it. A \`BankAccount\` holds a balance *and* the \`deposit\` and \`withdraw\` functions that are allowed to change it.

Interviews ask for the **four pillars**:

- **Encapsulation** — keep the data private and change it only through methods, so it cannot get into a bad state.
- **Abstraction** — expose *what* something does and hide *how*.
- **Inheritance** — a class builds on another, reusing its code (\`Car\` is a \`Vehicle\`).
- **Polymorphism** — code written for the base type works on any subtype, each behaving its own way.

Definitions are easy to recite. What gets you noticed is one **real example from code you wrote** for each.

**You need already:** C++ classes — members, constructors, \`public\` and \`private\`.`,
      conceptMd: `Everyone can recite these. Prepare a **one-sentence definition plus a real example from your own projects** for each — that is what makes the answer land.

**Encapsulation** — state is private, access is through methods that maintain invariants. Example: a metrics collector that validates a threshold on set, so it can never hold a negative value.

**Abstraction** — expose what, hide how. Example: an \`AlertChannel\` interface where callers do not know whether it is email or a webhook.

**Inheritance** — an "is-a" relationship reusing a base implementation. Use it sparingly; it is the most overused pillar.

**Polymorphism** — one interface, many implementations, resolved at runtime. Example: iterating a \`vector<unique_ptr<AlertChannel>>\` and calling \`send()\` on each without knowing which is which.

**Composition over inheritance** is the trade-off worth volunteering. Inheritance couples you to a base class's implementation forever; composition (holding a member and delegating) is more flexible. The rule of thumb: use inheritance for "is-a", composition for "has-a", and when in doubt prefer composition.

Your \`sentinel\` project has natural homes for all four — use it as your example bank.`,
      interviewAngle:
        "Everyone can recite the four. The band you land in is decided by whether each " +
        "definition arrives attached to code you wrote and a trade-off you can defend.",
      pitfalls: [
        "Answering with textbook definitions. Have a one-sentence definition plus a real " +
          "example from your own project for each.",
        "Reaching for inheritance to reuse code. Inheritance is for `is-a`; reuse without " +
          "that relationship is what composition is for.",
        "Leaving out the composition-over-inheritance trade-off. Volunteering it is most of " +
          "the value of the question.",
      ],
      recall: [
        {
          front: "Give the four pillars in one clause each.",
          back:
            "Encapsulation: state is private, access goes through methods that maintain " +
            "invariants. Abstraction: expose what, hide how. Inheritance: an is-a relationship " +
            "reusing a base implementation. Polymorphism: one interface, many implementations, " +
            "resolved at runtime.",
        },
        {
          front:
            "State the composition-over-inheritance rule of thumb and the reason behind it.",
          back:
            "Inheritance for is-a, composition for has-a, and prefer composition when in doubt. " +
            "Inheritance couples you to a base class's implementation permanently; composition " +
            "holds a member and delegates, so it can be changed.",
        },
        {
          front: "What makes an example of encapsulation actually good?",
          back:
            "That it names the invariant being protected — a threshold that validates on set so " +
            "it can never hold a negative value — rather than just saying the field is private.",
        },
      ],
      resources: [
        {
          title: "learncpp 14.1 — Introduction to object-oriented programming",
          url: "https://www.learncpp.com/cpp-tutorial/introduction-to-object-oriented-programming/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Starts from the non-OOP version of a program and shows what bundling data with behaviour buys you.",
          steps: [
            "Read the lesson, comparing the procedural and object-oriented versions of the example.",
            "Then read the GfG overview (next link) for one short example of each pillar.",
            "Write one example per pillar from your own projects, in one sentence each.",
          ],
          isPrimary: true,
        },
        {
          title: "GeeksforGeeks — Object oriented programming in C++",
          url: "https://www.geeksforgeeks.org/cpp/object-oriented-programming-in-cpp/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Each pillar with a small C++ example — useful for checking your own examples against.",
        },
      ],
    },
    {
      slug: "sde-oop-solid",
      title: "SOLID, with one example each",
      objective:
        "Name all five principles and give a concrete violation and fix for each.",
      estMinutes: 75,
      primer: `**SOLID** is five rules of thumb for classes that stay easy to change as a project grows:

- **S**ingle responsibility — a class should have one job.
- **O**pen/closed — add new behaviour by adding code, not by editing working code.
- **L**iskov substitution — a subclass must work anywhere its parent does.
- **I**nterface segregation — prefer several small interfaces over one huge one.
- **D**ependency inversion — depend on an interface, not on a concrete class.

Each rule exists because breaking it makes a specific kind of change painful. The best way to learn them — and to answer in an interview — is one **before and after** example for each: code that breaks the rule, and the fix.

**You need already:** the four pillars, especially inheritance and polymorphism.`,
      conceptMd: `Being able to name them is the floor. Have a **violation and a fix** ready for each.

**S — Single Responsibility.** A class has one reason to change. Violation: a \`Report\` class that computes *and* renders *and* emails. Fix: split into three.

**O — Open/Closed.** Open to extension, closed to modification. Violation: a \`switch\` on alert type that you must edit for every new type. Fix: an interface with one implementation per type.

**L — Liskov Substitution.** A subclass must be usable anywhere its base is. The classic violation is \`Square\` inheriting \`Rectangle\` — setting width on a Square changes the height, breaking every caller's assumption.

**I — Interface Segregation.** Do not force clients to depend on methods they do not use. Violation: one fat \`Worker\` interface. Fix: several small ones.

**D — Dependency Inversion.** Depend on abstractions, not concretions. Violation: a service constructing its own \`PostgresClient\`. Fix: inject a \`Store\` interface — and note that this is also what makes the thing testable, since a test can pass in a fake.

Do not over-apply these. "I would not split this yet, it is only one reason to change today" is a *better* answer than reflexive abstraction, and senior interviewers listen for exactly that judgement.`,
      interviewAngle:
        "Naming the five is the floor. A violation and a fix for each is the expected answer, " +
        "and knowing when *not* to apply them is what senior interviewers listen for.",
      pitfalls: [
        "Applying them reflexively. `I would not split this yet, it is only one reason to " +
          "change today` is a better answer than premature abstraction.",
        "Explaining Liskov abstractly. The Square-inheriting-Rectangle example does the work " +
          "in one sentence.",
        "Treating Dependency Inversion as ceremony. It is what makes the thing testable — a " +
          "test can pass in a fake.",
      ],
      recall: [
        {
          front: "Name all five SOLID principles.",
          back:
            "Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, " +
            "Dependency Inversion.",
        },
        {
          front: "Give the classic Liskov violation and say precisely what breaks.",
          back:
            "`Square` inheriting `Rectangle`. Setting the width on a Square also changes its " +
            "height, so any caller that assumed independent dimensions — and was written " +
            "against Rectangle — now behaves wrongly.",
        },
        {
          front: "What is the Open/Closed violation you will actually meet, and its fix?",
          back:
            "A `switch` on a type tag that has to be edited every time a new type is added. " +
            "Replace it with an interface and one implementation per type, so extension adds a " +
            "file instead of editing one.",
        },
        {
          front: "Why is Dependency Inversion about testing as much as design?",
          back:
            "Depending on an abstraction rather than constructing a concrete `PostgresClient` " +
            "means a test can inject a fake `Store`. The decoupling and the testability are the " +
            "same property.",
        },
      ],
      resources: [
        {
          title: "DigitalOcean — SOLID: the first five principles",
          url: "https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "Works through all five with code before and after — the shape a good interview answer takes.",
          steps: [
            "Read one principle at a time; for each, note the broken version and the fix.",
            "After each principle, write your own tiny violation and fix in C++ (the article uses PHP — the idea carries over).",
            "Close the page and say all five with one example each.",
          ],
          isPrimary: true,
        },
      ],
    },
    {
      slug: "sde-oop-patterns",
      title: "Four patterns worth knowing",
      objective:
        "Explain Singleton, Factory, Observer and Strategy — including when each is the wrong choice.",
      estMinutes: 75,
      primer: `A **design pattern** is a well-known solution to a problem that keeps coming up in object-oriented code — named, so developers can say "use a Strategy here" and be understood.

Four are enough for interviews:

- **Singleton** — exactly one instance, reachable from anywhere (a config object).
- **Factory** — a method that decides which class to create, so callers do not have to.
- **Observer** — objects subscribe to another and are notified when it changes (event listeners).
- **Strategy** — interchangeable algorithms behind one interface (different payment methods).

For each, know the problem it solves, a sketch of the code, and **when not to use it** — that last part is what interviewers listen for.

**You need already:** polymorphism and interfaces from the earlier units.`,
      conceptMd: `Four is enough. Knowing twenty superficially is worse than knowing four with judgement.

**Singleton** — one instance, globally reachable. Used for config and connection pools. **Say the downsides**: it is global state, it makes testing hard, and it needs care to be thread-safe. Volunteering that is the whole point of the question.

**Factory** — creation logic behind one call, so callers do not name concrete classes. Useful when the concrete type depends on config or input.

**Observer** — subjects notify subscribers of state changes. This is the pattern behind event systems, and behind Prometheus-style monitoring conceptually.

**Strategy** — swap an algorithm at runtime through a common interface. A retry policy that can be fixed-delay or exponential-backoff is a clean example — and it is one you will actually implement in \`atlas\`.

The meta-answer that impresses: patterns are a **vocabulary for describing designs**, not a checklist to apply. Reaching for a pattern before you have the problem is how codebases get complicated.`,
      interviewAngle:
        "The meta-answer is the one that impresses: patterns are a vocabulary for describing " +
        "designs, not a checklist to apply. Volunteering a pattern's downsides is the same " +
        "move.",
      pitfalls: [
        "Describing Singleton without its downsides. It is global state, it makes testing " +
          "hard, and thread safety takes care — saying so is the point of the question.",
        "Knowing twenty patterns superficially. Four with judgement beats twenty as trivia.",
        "Reaching for a pattern before you have the problem. That is how codebases get " +
          "complicated.",
      ],
      recall: [
        {
          front: "Singleton — what is it for, and what are the three downsides to volunteer?",
          back:
            "One instance, globally reachable; used for config and connection pools. The " +
            "downsides: it is global state, it makes testing hard because you cannot substitute " +
            "it, and it needs care to be thread-safe.",
        },
        {
          front: "Strategy versus Factory — what does each vary?",
          back:
            "Factory varies *which concrete type gets created*, hiding construction behind one " +
            "call. Strategy varies *which algorithm runs*, swapped at runtime through a common " +
            "interface — a retry policy that can be fixed-delay or exponential backoff.",
        },
        {
          front: "What is the meta-answer about design patterns?",
          back:
            "They are a shared vocabulary for describing designs that already exist, not a " +
            "checklist to apply up front. Reaching for a pattern before you have the problem is " +
            "how simple code becomes complicated.",
        },
      ],
      resources: [
        {
          title: "Refactoring Guru — Strategy",
          url: "https://refactoring.guru/design-patterns/strategy",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Each pattern page follows the same order: the problem, the solution, a diagram, code, and when not to use it.",
          steps: [
            "Read **Problem**, **Solution** and **Real-World Analogy**, then **Pros and Cons**.",
            "Look at the C++ example under *Code Examples*.",
            "Repeat for [Observer](https://refactoring.guru/design-patterns/observer), [Factory Method](https://refactoring.guru/design-patterns/factory-method) and [Singleton](https://refactoring.guru/design-patterns/singleton).",
            "For each of the four, write one sentence on when *not* to use it.",
          ],
          isPrimary: true,
        },
        {
          title: "Refactoring Guru — Observer",
          url: "https://refactoring.guru/design-patterns/observer",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Subscribe-and-notify, the pattern behind every event system.",
        },
        {
          title: "Refactoring Guru — Singleton",
          url: "https://refactoring.guru/design-patterns/singleton",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "The simplest pattern, and the one whose downsides you are expected to volunteer.",
        },
      ],
    },
  ],
};
