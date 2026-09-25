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
      primer: `A running C++ program keeps its data in two main places.

The **stack** holds a function's local variables. Space is taken when the function starts and handed back automatically when it returns. It is very fast but small (a few megabytes), which is why very deep recursion crashes.

The **heap** is a large pool you request from explicitly with \`new\` and must give back with \`delete\`. Heap memory lives until you free it, so it outlives the function that created it — useful, but it means *you* are responsible.

Getting that responsibility wrong causes the classic bugs: forgetting to free (a **leak**), using memory after freeing it (a **dangling pointer**), or freeing it twice. Tools like Valgrind and AddressSanitizer find them for you.

**You need already:** functions, and what a pointer holds (an address).`,
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
          title: "learncpp 20.2 — The stack and the heap",
          url: "https://www.learncpp.com/cpp-tutorial/the-stack-and-the-heap/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Explains both regions from scratch: what goes where, and what each costs.",
          steps: [
            "Read the whole lesson, stopping to predict where each example variable lives.",
            "Then read learncpp 19.1 (next link) on `new` and `delete`.",
            "Write a program that leaks on purpose and run it under Valgrind (last link).",
          ],
          isPrimary: true,
        },
        {
          title: "learncpp 19.1 — Dynamic memory allocation with new and delete",
          url: "https://www.learncpp.com/cpp-tutorial/dynamic-memory-allocation-with-new-and-delete/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "`new` and `delete` with each failure mode — dangling pointers, leaks, double delete — explained.",
        },
        {
          title: "Valgrind quick start",
          url: "https://valgrind.org/docs/manual/quick-start.html",
          kind: "lab",
          whyThisOne:
            "Run your deliberately leaking program under it and read the report.",
        },
      ],
    },
    {
      slug: "sde-cpp-pointers-refs",
      title: "Pointers, references & const correctness",
      objective:
        "State the real differences between a pointer and a reference, and read a const declaration right to left.",
      estMinutes: 60,
      primer: `A **pointer** is a variable that holds a memory address. \`int* p = &x;\` stores the address of \`x\`; \`*p\` reads or changes the value at that address. A pointer can be \`nullptr\` (pointing at nothing) and can be changed to point somewhere else.

A **reference** is a second name for an existing variable: \`int& r = x;\` — using \`r\` *is* using \`x\`. It must be set when created, can never be empty, and can never be moved to another variable.

Both let a function change the caller's variable, or avoid copying something large. The rule of thumb: use a reference when the thing must exist, a pointer when "nothing" is a valid answer.

\`const\` adds a promise not to change something. With pointers it can apply to the value (\`const int* p\`) or to the pointer itself (\`int* const p\`) — reading the declaration right to left tells you which.

**You need already:** variables and functions in C++.`,
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
          title: "learncpp 12.7 — Introduction to pointers",
          url: "https://www.learncpp.com/cpp-tutorial/introduction-to-pointers/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Pointers from nothing: the address-of operator, dereferencing, and what a pointer really stores.",
          steps: [
            "Read the lesson and run each example, printing both `p` and `*p`.",
            "Then read learncpp 12.3 on references (next link).",
            "Then read learncpp 12.9 on pointers and const (last link) and decode `const int* const p` out loud.",
          ],
          isPrimary: true,
        },
        {
          title: "learncpp 12.3 — Lvalue references",
          url: "https://www.learncpp.com/cpp-tutorial/lvalue-references/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "What a reference is, and the rules that make it different from a pointer.",
        },
        {
          title: "learncpp 12.9 — Pointers and const",
          url: "https://www.learncpp.com/cpp-tutorial/pointers-and-const/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "The four combinations of const and pointer, one at a time.",
        },
      ],
    },
    {
      slug: "sde-cpp-raii-smart",
      title: "RAII & smart pointers",
      objective:
        "Explain RAII as the idea behind C++ resource safety, and choose between unique_ptr and shared_ptr.",
      estMinutes: 75,
      primer: `Remembering to \`delete\` everything you \`new\` is error-prone — especially when a function can return early or throw. C++'s answer is **RAII** (Resource Acquisition Is Initialisation): wrap the resource in an object whose **destructor** releases it. Destructors run automatically whenever the object goes out of scope, on *every* path out, so the cleanup cannot be forgotten.

**Smart pointers** are RAII for heap memory:

- \`unique_ptr\` — one owner. When it goes away, the memory is freed. It cannot be copied, only *moved* to a new owner.
- \`shared_ptr\` — shared ownership with a counter; the memory is freed when the last owner goes away.

In modern C++ you almost never write \`delete\` yourself. Default to \`unique_ptr\`.

**You need already:** the stack/heap unit, and classes with constructors and destructors.`,
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
          title: "learncpp 22.1 — Introduction to smart pointers and move semantics",
          url: "https://www.learncpp.com/cpp-tutorial/introduction-to-smart-pointers-move-semantics/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Builds a tiny smart pointer by hand, which shows exactly why RAII works and why copying is the hard part.",
          steps: [
            "Read the lesson; type the hand-written smart pointer class and run it.",
            "Read the part where copying it goes wrong — that problem is why move semantics exist.",
            "Then read 22.5 `unique_ptr` (next link); skim 22.6 `shared_ptr` (last link).",
          ],
          isPrimary: true,
        },
        {
          title: "learncpp 22.5 — std::unique_ptr",
          url: "https://www.learncpp.com/cpp-tutorial/stdunique_ptr/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "The smart pointer you should reach for first, and `make_unique`.",
        },
        {
          title: "learncpp 22.6 — std::shared_ptr",
          url: "https://www.learncpp.com/cpp-tutorial/stdshared_ptr/",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "Shared ownership, the reference count, and its cost.",
        },
      ],
    },
    {
      slug: "sde-cpp-virtual",
      title: "Virtual functions, vtables & move semantics",
      objective:
        "Explain dynamic dispatch mechanically, and say why a base class needs a virtual destructor.",
      estMinutes: 75,
      primer: `**Polymorphism** lets one piece of code work with many types. With a base class \`Shape\` and derived classes \`Circle\` and \`Square\`, a \`Shape*\` can point at either; calling \`shape->area()\` should run the right version for the actual object.

Marking the function \`virtual\` in the base class makes that happen. Behind the scenes, each class with virtual functions gets a hidden table of function addresses — the **vtable** — and every object carries a hidden pointer to its class's table. A virtual call looks the function up there at run time.

One rule follows: a base class meant to be used this way needs a **virtual destructor**, otherwise deleting a \`Circle\` through a \`Shape*\` runs only \`Shape\`'s destructor.

**Move semantics** is a separate idea covered here too: letting an object hand its heap memory to another instead of copying it.

**You need already:** classes and inheritance in C++.`,
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
          title: "learncpp 25.2 — Virtual functions and polymorphism",
          url: "https://www.learncpp.com/cpp-tutorial/virtual-functions/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Starts with the problem a base-class pointer has without `virtual`, then fixes it.",
          steps: [
            "Read the lesson and run the example with and without `virtual`.",
            "Then read learncpp 25.6 on the virtual table (next link) and draw the vtable for two classes.",
            "Then read 22.3 on move constructors (last link).",
          ],
          isPrimary: true,
        },
        {
          title: "learncpp 25.6 — The virtual table",
          url: "https://www.learncpp.com/cpp-tutorial/the-virtual-table/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "The actual mechanism — what turns a memorised rule into an explanation.",
        },
        {
          title: "learncpp 22.3 — Move constructors and move assignment",
          url: "https://www.learncpp.com/cpp-tutorial/move-constructors-and-move-assignment/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Moving instead of copying, and why it makes returning big objects cheap.",
        },
      ],
    },
  ],
};
