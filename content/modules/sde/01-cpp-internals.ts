import type { Module } from "@/content/types";

export const cppInternals: Module = {
  slug: "sde-cpp-internals",
  trackSlug: "sde",
  phaseSlug: "foundations",
  order: 1,
  title: "C++ language internals",
  summary:
    "Embedded and systems interviews ask about memory rather than algorithms. This module covers what the machine does underneath the language, so those questions become descriptive rather than speculative.",
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
      interviewAngle:
        "Embedded and systems rounds ask about memory instead of algorithms. Struct padding in " +
        "particular is a real question, and it rewards having done the arithmetic once.",
      pitfalls: [
        "Returning the address of a local. The stack frame is gone the moment the function " +
          "returns — the canonical dangling pointer.",
        "Assuming a dangling pointer crashes. It frequently appears to work, which is what " +
          "makes it dangerous.",
        "Computing a struct's size by adding its members. Alignment padding usually makes it " +
          "larger.",
      ],
      recall: [
        {
          front: "Stack versus heap: lifetime, cost and size.",
          back:
            "Stack is automatic storage freed when the scope exits, allocated by a pointer " +
            "bump, and small (typically 1-8 MB) — which is why deep recursion overflows. Heap " +
            "is dynamic, lives until explicitly freed, is large, slower, and fragmentable.",
        },
        {
          front: "Name the three classic memory failures and what each does.",
          back:
            "A leak: allocated and never freed, so the process grows until the OOM killer " +
            "arrives. A dangling pointer: the pointee was freed but the address is still held, " +
            "and using it is undefined behaviour that often appears to work. A double free: " +
            "corrupts allocator metadata and usually crashes somewhere else entirely.",
        },
        {
          front: "How many bytes is `struct { char a; int b; char c; };` and why?",
          back:
            "Usually 12, not 6. The compiler pads to align `int` on a 4-byte boundary and pads " +
            "the tail to keep the struct's own alignment. Reordering largest-first shrinks it " +
            "to 8.",
        },
      ],
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
      interviewAngle:
        "Reading a const declaration out loud, correctly, right-to-left, is a small fluency " +
        "test that comes up more than you would expect.",
      pitfalls: [
        "Reading const declarations left to right. Read right to left: `const int *p` is a " +
          "pointer to const int; `int *const p` is a const pointer to int.",
        "Passing large objects by value. `const T&` avoids the copy and documents the intent.",
        "Calling `sizeof` on an array parameter. The array decayed to a pointer at the call, " +
          "so you get the pointer size, not the array size.",
      ],
      recall: [
        {
          front: "Three real differences between a reference and a pointer.",
          back:
            "A reference must be initialised, can never be rebound, and cannot be null. A " +
            "pointer may be null, may be reassigned, and supports arithmetic. Use a reference " +
            "when the thing must exist; a pointer when absence is meaningful.",
        },
        {
          front: "Read `const int *p` and `int *const p` out loud.",
          back:
            "`const int *p`: p is a pointer to a const int — the value cannot change through p. " +
            "`int *const p`: p is a const pointer to an int — p cannot be repointed.",
        },
        {
          front:
            "Why does `sizeof(arr)` give a different answer inside a function than outside it?",
          back:
            "An array decays to a pointer when passed to a function, so inside the function " +
            "`sizeof` measures the pointer. In the defining scope it measures the whole array.",
        },
      ],
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
      interviewAngle:
        "Explaining RAII well is the single clearest signal that you understand C++ rather than " +
        "merely write it. The shared_ptr cycle is the follow-up.",
      pitfalls: [
        "Reaching for `shared_ptr` by default. `unique_ptr` is the default; shared ownership " +
          "costs an atomic increment per copy and invites cycles.",
        "Two objects holding `shared_ptr`s to each other. Neither refcount reaches zero, so " +
          "both leak — break the cycle with `weak_ptr`.",
        "Writing `new` directly. `make_unique` and `make_shared` do fewer allocations and " +
          "close the window where an exception could leak.",
        "Manual lock and unlock. `lock_guard` releases on every exit path, including an " +
          "exception.",
      ],
      recall: [
        {
          front: "What is RAII, and why does it make cleanup impossible to forget?",
          back:
            "Resource Acquisition Is Initialisation: tie a resource's lifetime to an object's. " +
            "The constructor acquires and the destructor releases — and destructors run on " +
            "*every* exit path, including exceptions, so there is no path that skips cleanup.",
        },
        {
          front: "`unique_ptr`, `shared_ptr`, `weak_ptr` — one line each.",
          back:
            "`unique_ptr` is sole ownership with zero overhead, movable but not copyable, and " +
            "should be the default. `shared_ptr` is shared ownership by reference counting, " +
            "costing an atomic per copy. `weak_ptr` is a non-owning observer, and the fix for " +
            "reference cycles.",
        },
        {
          front: "Why do two objects holding `shared_ptr`s to each other leak?",
          back:
            "Each keeps the other's reference count above zero, so neither destructor ever " +
            "runs. Making one direction a `weak_ptr` breaks the cycle.",
        },
      ],
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
      interviewAngle:
        "The virtual destructor rule is asked very often, and it has a crisp mechanical answer. " +
        "`std::move` does not move anything is the other line worth having ready.",
      pitfalls: [
        "Omitting a virtual destructor on a base class with virtual functions. Deleting " +
          "through a base pointer then skips the derived destructor — undefined behaviour and a " +
          "leak.",
        "Writing `return std::move(x)` for a local. That defeats RVO, so it is a " +
          "pessimisation rather than an optimisation.",
        "Believing `std::move` moves. It is a cast that marks the object as expendable; the " +
          "move happens in the constructor or assignment that receives it.",
      ],
      recall: [
        {
          front: "Mechanically, what happens on a virtual call?",
          back:
            "The object carries a hidden vptr to its class's vtable. The call loads the vptr, " +
            "indexes the vtable to find the function address, and calls it — one extra " +
            "indirection, which is what virtual costs.",
        },
        {
          front: "State the virtual destructor rule and the consequence of breaking it.",
          back:
            "If a class has any virtual function, its destructor must be virtual. Otherwise " +
            "deleting a derived object through a base pointer is undefined behaviour — the " +
            "derived destructor never runs and its resources leak.",
        },
        {
          front: "What does `std::move` actually do?",
          back:
            "Nothing at runtime. It is a cast to an rvalue reference that says `you may treat " +
            "this as expendable`, which lets overload resolution pick a move constructor or " +
            "move assignment.",
        },
        {
          front: "Why is `return std::move(local);` worse than `return local;`?",
          back:
            "Returning a local by value is already elided by RVO. The explicit move blocks that " +
            "elision and forces an actual move construction instead of none at all.",
        },
      ],
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
