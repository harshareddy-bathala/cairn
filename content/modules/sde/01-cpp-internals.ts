import type { Module } from "@/content/types";

export const cppInternals: Module = {
  slug: "sde-cpp-internals",
  trackSlug: "sde",
  phaseSlug: "foundations",
  order: 1,
  title: "C++ language internals",
  summary:
    "National Instruments and TI interviews go deep on C and memory. This is the module that makes you comfortable when the questions stop being about algorithms and start being about what the machine is doing.",
  units: [
    {
      slug: "sde-cpp-memory",
      title: "Stack, heap & object lifetime",
      objective:
        "Explain where a variable lives, when it dies, and what a dangling pointer actually is.",
      estMinutes: 75,
      conceptMd: `**Stack**: automatic storage, freed when the scope exits, fast (a pointer bump), small (typically 1–8 MB), and the reason deep recursion overflows.

**Heap**: dynamic storage via \`new\`/\`malloc\`, lives until explicitly freed, large, slower, and fragmentable.

The three classic failures, and you should be able to name each on sight:

- **Memory leak** — allocated and never freed. The process grows until the OOM killer arrives.
- **Dangling pointer** — the pointee was freed but the pointer still holds the address. Using it is undefined behaviour, and the cruel part is that it often *appears* to work.
- **Double free** — freeing the same block twice, which corrupts allocator metadata and typically crashes somewhere else entirely.

Returning the address of a local is the canonical dangling-pointer bug: the stack frame is gone the moment the function returns.

Also know **struct padding** — compilers align members, so \`struct { char a; int b; char c; }\` is usually 12 bytes, not 6. Reordering members largest-first shrinks it to 8. That is a real embedded-systems interview question.`,
      resources: [
        {
          title: "learncpp — dynamic memory allocation",
          url: "https://www.learncpp.com/cpp-tutorial/dynamic-memory-allocation-with-new-and-delete/",
          kind: "read",
          minutes: 40,
          whyThisOne: "The most careful free C++ resource; it explains the failure modes rather than just the syntax.",
          isPrimary: true,
        },
        {
          title: "Valgrind quick start",
          url: "https://valgrind.org/docs/manual/quick-start.html",
          kind: "lab",
          minutes: 30,
          whyThisOne: "Write a leaking program deliberately, then watch valgrind find it. That loop teaches fast.",
        },
      ],
    },
    {
      slug: "sde-cpp-pointers-refs",
      title: "Pointers, references & const correctness",
      objective:
        "State the real differences between a pointer and a reference, and read a const declaration right to left.",
      estMinutes: 60,
      conceptMd: `A **reference** must be initialised, can never be rebound, and cannot be null. A **pointer** may be null, may be reassigned, and supports arithmetic. Prefer references when the thing must exist; use a pointer when absence is meaningful.

Read const declarations **right to left**:
- \`const int *p\` — p is a pointer to a const int. The value cannot change through p.
- \`int *const p\` — p is a const pointer to an int. p cannot be repointed.
- \`const int *const p\` — neither.

\`const\` correctness matters beyond style: a \`const\` member function promises not to modify the object, which is what lets it be called on const references — and passing large objects as \`const T&\` instead of by value is the standard way to avoid a copy.

Arrays and pointers are related but not identical: an array **decays** to a pointer when passed to a function, which is why \`sizeof\` gives the array size in the defining scope and the pointer size inside the function. That trips people up constantly and is worth demonstrating to yourself.`,
      resources: [
        {
          title: "learncpp — lvalue references and pointers",
          url: "https://www.learncpp.com/cpp-tutorial/lvalue-references/",
          kind: "read",
          minutes: 35,
          whyThisOne: "Careful about the exact distinctions interviewers probe, rather than hand-waving them.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "sde-cpp-raii-smart",
      title: "RAII & smart pointers",
      objective:
        "Explain RAII as the idea behind C++ resource safety, and choose between unique_ptr and shared_ptr.",
      estMinutes: 75,
      conceptMd: `**RAII** — Resource Acquisition Is Initialisation — is arguably C++'s central idea: tie a resource's lifetime to an object's lifetime. The constructor acquires, the destructor releases, and because destructors run on *every* exit path including exceptions, cleanup cannot be forgotten. That is why \`std::lock_guard\` is safer than manual lock/unlock.

**\`unique_ptr\`** — sole ownership, zero overhead, movable but not copyable. **This should be your default.**
**\`shared_ptr\`** — shared ownership via reference counting. Costs an atomic increment per copy, and two objects holding \`shared_ptr\`s to each other **leak**, because neither count reaches zero.
**\`weak_ptr\`** — a non-owning observer, and the fix for exactly that cycle.

Prefer \`make_unique\`/\`make_shared\` over bare \`new\`: fewer allocations, and no window where an exception could leak.

If you can explain RAII well, you are signalling that you understand C++ rather than merely writing it — and the same idea maps directly onto the reliability patterns in your SRE track.`,
      resources: [
        {
          title: "C++ Core Guidelines — Resource management",
          url: "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource",
          kind: "docs",
          minutes: 35,
          whyThisOne: "From the people who designed the language; each rule states the reasoning.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "sde-cpp-virtual",
      title: "Virtual functions, vtables & move semantics",
      objective:
        "Explain dynamic dispatch mechanically, and say why a base class needs a virtual destructor.",
      estMinutes: 75,
      conceptMd: `A class with virtual functions gets a hidden **vptr** pointing at a per-class **vtable** of function addresses. A virtual call is therefore an extra indirection: load the vptr, index the vtable, call. That is the cost, and it is why virtual is not free.

**The virtual destructor rule.** Deleting a derived object through a base pointer when the base destructor is *not* virtual is undefined behaviour — the derived destructor never runs and its resources leak. Rule: **if a class has any virtual function, its destructor must be virtual.** This is asked in interviews very often.

**Move semantics** exist to avoid copying when the source is about to die. A move constructor steals the internal pointer and nulls the source, turning an O(n) copy into an O(1) pointer swap. \`std::move\` does not move anything — it is a cast that says "you may treat this as expendable". Returning a local by value is already optimised by RVO, so \`return std::move(x)\` is a pessimisation, not an optimisation.`,
      resources: [
        {
          title: "learncpp — virtual functions and the vtable",
          url: "https://www.learncpp.com/cpp-tutorial/the-virtual-table/",
          kind: "read",
          minutes: 35,
          whyThisOne: "Shows the actual mechanism, which is what turns a memorised rule into an explanation.",
          isPrimary: true,
        },
      ],
    },
  ],
};
