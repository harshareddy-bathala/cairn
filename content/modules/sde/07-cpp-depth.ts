import type { Module } from "@/content/types";

export const cppDepth: Module = {
  slug: "sde-cpp-depth",
  trackSlug: "sde",
  phaseSlug: "depth",
  order: 4,
  title: "C++ at the metal",
  summary:
    "For product-company and instrumentation rounds, where the questions move from \"what is a vtable\" to \"why is this struct 24 bytes\", \"why does this cast crash only with -O2\" and \"how would you find this leak\". Memory layout, pointer rules, and the tools and idioms that keep resource management correct.",
  prereqSlugs: ["sde-cpp-internals"],
  units: [
    {
      slug: "sde-cppd-layout",
      title: "Memory layout, alignment & padding",
      objective:
        "Predict sizeof and member offsets for a struct, reorder members to remove padding, and explain what packing and cache lines cost.",
      estMinutes: 60,
      primer: `\`sizeof\` a struct is often bigger than the sum of its fields. The reason is **alignment**: the CPU reads memory fastest when, for example, a 4-byte \`int\` starts at an address divisible by 4. So the compiler inserts invisible **padding** bytes to line fields up.

\`\`\`cpp
struct A { char c; int i; char d; };  // 1 + 3 pad + 4 + 1 + 3 pad = 12 bytes
struct B { int i; char c; char d; };  // 4 + 1 + 1 + 2 pad = 8 bytes
\`\`\`

Same fields, different order, a third less memory. Ordering fields from largest to smallest usually removes most padding.

This matters when you store millions of structs, send them over a network, or share them between threads (two threads writing fields on the same 64-byte **cache line** slow each other down).

**You need already:** C++ structs and \`sizeof\`.`,
      conceptMd: `Every type has an **alignment** — the address it must start at is a multiple of it. On a typical 64-bit platform: \`char\` 1, \`short\` 2, \`int\` 4, \`double\` and pointers 8.

The compiler lays members out **in declaration order** and inserts **padding** so each is aligned; then it pads the end so the whole struct's size is a multiple of its largest alignment (so arrays of it stay aligned).

\`\`\`cpp
struct Bad  { char a; double d; char b; };   // 1 + 7 pad + 8 + 1 + 7 pad = 24
struct Good { double d; char a; char b; };   // 8 + 1 + 1 + 6 pad          = 16
static_assert(sizeof(Bad) == 24 && sizeof(Good) == 16);
\`\`\`

**Order members from largest alignment to smallest** and most padding disappears. Check with \`sizeof\`, \`alignof\` and \`offsetof\` rather than guessing.

Other layout facts that come up:

- An **empty class** has \`sizeof\` 1, so two objects have distinct addresses. (As a base class it can take zero space — the empty base optimisation.)
- A class with virtual functions gets a hidden **vptr**, usually 8 bytes at the start.
- \`#pragma pack(1)\` removes padding, but misaligned access is slower on most CPUs and faults on some; use it only for wire or file formats, and prefer serialising field by field.

**Cache lines.** Memory moves in 64-byte lines. Fields used together should sit together. Two threads writing to *different* variables that share one cache line slow each other down — **false sharing** — because each write invalidates the other core's copy of the line. \`alignas(64)\` on per-thread counters fixes it.`,
      interviewAngle:
        "\"What is sizeof this struct?\" is a staple of embedded and systems rounds. Working it out " +
        "aloud with alignment and trailing padding — then reordering to shrink it — answers the " +
        "question and the follow-up in one go.",
      pitfalls: [
        "Forgetting the trailing padding that makes the size a multiple of the largest alignment.",
        "Assuming members are reordered by the compiler — in C++ they are laid out in declaration order.",
        "Using #pragma pack for in-memory structs and paying for misaligned access.",
        "Per-thread counters packed next to each other in an array, causing false sharing.",
      ],
      recall: [
        {
          front: "Why is a struct's size rounded up to a multiple of its largest member alignment?",
          back: "So every element of an array of that struct is correctly aligned, not just the first.",
        },
        {
          front: "What is false sharing?",
          back:
            "Two threads writing different variables on the same 64-byte cache line, forcing the " +
            "line to bounce between cores; separate them with alignas(64) or padding.",
        },
        {
          front: "What is sizeof an empty class, and why isn't it zero?",
          back: "1, so that distinct objects have distinct addresses.",
        },
      ],
      resources: [
        {
          title: "The Lost Art of Structure Packing",
          url: "http://www.catb.org/esr/structure-packing/",
          kind: "read",
          minutes: 40,
          whyThisOne:
            "Alignment, padding and reordering, worked through with many examples.",
          steps: [
            "Read sections on alignment requirements and padding, predicting each struct's size before the text does.",
            "Check your predictions with `sizeof` and `offsetof` in a small program.",
            "Read the section on structure reordering and shrink one struct of your own.",
            "Skip bitfields for now.",
          ],
          isPrimary: true,
        },
        {
          title: "learncpp 4.3 — Object sizes and the sizeof operator",
          url: "https://www.learncpp.com/cpp-tutorial/object-sizes-and-the-sizeof-operator/",
          kind: "read",
          whyThisOne:
            "The basics of sizeof, if they are rusty.",
        },
        {
          title: "cppreference — Object representation and alignment",
          url: "https://en.cppreference.com/cpp/language/object",
          kind: "docs",
          whyThisOne:
            "The precise rules behind sizeof, alignment and layout.",
        },
      ],
    },
    {
      slug: "sde-cppd-pointers",
      title: "Pointer arithmetic & strict aliasing",
      objective:
        "Reason about pointer arithmetic and its bounds, and explain the strict aliasing rule and the safe ways to reinterpret bytes.",
      estMinutes: 70,
      primer: `Two rules that surprise people who learned pointers casually.

**Pointer arithmetic moves in elements, not bytes.** If \`p\` is an \`int*\`, \`p + 1\` points to the next \`int\`, 4 bytes later. It is only valid *within one array* (and one past its end); stepping outside is undefined behaviour even if you never read the memory.

**Strict aliasing.** The compiler assumes that pointers of unrelated types — an \`int*\` and a \`float*\` — never point at the same memory, and optimises on that assumption. Code that reinterprets bytes through a cast (\`*(float*)&someInt\`) can therefore work at \`-O0\` and break at \`-O2\`. The safe ways to reinterpret bytes are \`memcpy\` and, in C++20, \`std::bit_cast\`.

**Undefined behaviour** means the standard makes no promise at all — the optimiser may assume it never happens.

**You need already:** pointers, and compiling with different \`-O\` levels.`,
      conceptMd: `**Pointer arithmetic is scaled by the pointee's size.** If \`p\` is an \`int*\`, \`p + 1\` is 4 bytes further on, and \`q - p\` counts *elements* (a \`ptrdiff_t\`), not bytes. \`a[i]\` is defined as \`*(a + i)\`.

**The bounds rule.** Arithmetic is only defined within one array, plus the position **one past the end**. You may form and compare that one-past-the-end pointer (it is how \`end()\` works), but not dereference it. Anything further — even computing \`p + 10\` on a 5-element array without dereferencing — is **undefined behaviour**.

**Array decay.** An array passed to a function becomes a pointer to its first element and loses its size — which is why \`sizeof(arr)\` inside the function returns the pointer size. Pass a \`std::span\` or the size explicitly.

**Strict aliasing.** The compiler may assume that pointers to **different, unrelated types do not point to the same memory**. So this is undefined behaviour:

\`\`\`cpp
float f = 1.0f;
uint32_t bits = *reinterpret_cast<uint32_t*>(&f);   // UB: reading a float through a uint32_t*
\`\`\`

It often "works" at \`-O0\` and breaks at \`-O2\`, when the optimiser reorders or removes loads it believes cannot alias. The safe ways:

\`\`\`cpp
uint32_t bits;  std::memcpy(&bits, &f, sizeof bits);   // compilers turn this into one move
auto bits2 = std::bit_cast<uint32_t>(f);               // C++20
\`\`\`

The exceptions: you may always inspect any object's bytes through \`char\`, \`unsigned char\` or \`std::byte\`. Reading a different member of a **union** than the one last written is allowed in C but undefined in C++.

**Undefined behaviour is not "platform-specific behaviour".** The compiler assumes it never happens and optimises on that assumption, which is why UB bugs appear and disappear with optimisation levels.`,
      interviewAngle:
        "\"Why does this code break only in release builds?\" is a favourite for instrumentation and " +
        "low-level roles, and strict aliasing is the classic answer. Offering memcpy or bit_cast as " +
        "the fix shows you know the rule, not just the symptom.",
      pitfalls: [
        "Type-punning through reinterpret_cast pointers and relying on it because it worked in a debug build.",
        "Computing pointers beyond one-past-the-end, which is UB even without a dereference.",
        "Using sizeof on an array parameter and getting the pointer size.",
        "Using a union to reinterpret bytes in C++, where it is undefined.",
      ],
      recall: [
        {
          front: "If p is an int*, how many bytes does p + 3 advance, and what type is q - p?",
          back: "3 × sizeof(int), typically 12 bytes; q − p is a ptrdiff_t counting elements, not bytes.",
        },
        {
          front: "What does the strict aliasing rule let the compiler assume?",
          back:
            "That pointers to different, unrelated types never refer to the same object, so it " +
            "can reorder or drop loads — which breaks type-punning through casts.",
        },
        {
          front: "What are the well-defined ways to read a float's bits as a uint32_t?",
          back: "std::memcpy into a uint32_t, or std::bit_cast<uint32_t>(f) in C++20.",
        },
      ],
      resources: [
        {
          title: "Shafik Yaghmour — What is strict aliasing and why do we care?",
          url: "https://gist.github.com/shafik/848ae25ee209f698763cffee272a58f8",
          kind: "read",
          minutes: 40,
          whyThisOne:
            "The definitive explainer, with compiler output showing the optimisation happen.",
          steps: [
            "Read the introduction and the first examples; run one at `-O0` and `-O2` and compare.",
            "Read the part on the allowed ways to type-pun (`memcpy`, `bit_cast`).",
            "Skim the C-standard details.",
          ],
          isPrimary: true,
        },
        {
          title: "cppreference — Undefined behavior",
          url: "https://en.cppreference.com/cpp/language/ub",
          kind: "docs",
          whyThisOne:
            "Examples of UB and how optimisers take advantage of it.",
        },
      ],
    },
    {
      slug: "sde-cppd-leaks",
      title: "Leaks, AddressSanitizer & the rule of 0/3/5",
      objective:
        "Find memory errors with AddressSanitizer and Valgrind, and apply the rule of zero, three and five to classes that own resources.",
      estMinutes: 75,
      primer: `Memory bugs rarely crash where they are caused, so you find them with tools rather than by reading code.

- **AddressSanitizer** (ASan): compile with \`-fsanitize=address -g\` and run. It stops at the exact line of an out-of-bounds access, a use-after-free or a double free, and at exit it reports leaks.
- **Valgrind**: runs an existing program under a checker, with no recompiling — slower, but handy.

Preventing the bugs is about ownership. A class that owns a resource (memory, a file) must handle copying and destruction correctly. The **rule of three/five**: if you write any of the destructor, copy constructor or copy assignment (plus the two move operations), you almost certainly need all of them. The **rule of zero** is better: hold resources in \`unique_ptr\`, \`vector\` and friends, write none of them, and let the defaults be correct.

**You need already:** RAII and smart pointers from Phase 1.`,
      conceptMd: `**Finding memory bugs.** Do not hunt them by reading code — let tools do it.

**AddressSanitizer** instruments the program at compile time:

\`\`\`bash
g++ -g -O1 -fsanitize=address -fno-omit-frame-pointer main.cpp && ./a.out
\`\`\`

It stops at the first **heap-buffer-overflow**, **use-after-free**, **double-free** or stack overflow of a buffer, and prints the stack of the bad access *and* of where the memory was allocated and freed. Its **LeakSanitizer** reports leaks at exit. Cost: about 2× slower — cheap enough to run the whole test suite with it in CI.

**Valgrind** (\`valgrind --leak-check=full ./a.out\`) needs no recompilation but runs 20–50× slower. Useful for a binary you cannot rebuild.

**Where leaks come from** in modern C++: a raw \`new\` whose \`delete\` is skipped by an early return or exception; \`shared_ptr\` cycles; containers of raw owning pointers.

**The rules for classes that own resources:**

- **Rule of three**: if a class needs a user-defined **destructor**, **copy constructor** or **copy assignment**, it almost certainly needs all three. The default copy of a raw owning pointer copies the pointer — two objects, one allocation, a double free.
- **Rule of five**: add the **move constructor** and **move assignment**, so the class can be moved cheaply. Declaring a destructor or copy operation suppresses the implicit moves, silently turning moves into copies.
- **Rule of zero** — the one to aim for: own resources only through RAII members (\`std::vector\`, \`std::string\`, \`std::unique_ptr\`) and declare **none** of the five. The compiler-generated versions are then correct.

\`\`\`cpp
class Buffer {                      // rule of zero: nothing to write, nothing to get wrong
  std::unique_ptr<std::byte[]> data_;
  std::size_t size_;
};
\`\`\`

A class following the rule of zero with a \`unique_ptr\` member is movable and non-copyable automatically — usually exactly right.`,
      interviewAngle:
        "\"How would you find a memory leak?\" wants a tool, not a code-reading strategy: ASan in " +
        "tests, Valgrind for an existing binary. \"Rule of three/five/zero\" is the design " +
        "question that follows — and \"I aim for zero\" is the answer.",
      pitfalls: [
        "Writing a destructor that frees a raw pointer but keeping the default copy constructor — a double free.",
        "Declaring a destructor and unknowingly losing the implicit move operations.",
        "Hunting memory bugs by inspection instead of running ASan.",
        "Leaving ASan out of CI because it is only used when a bug is already suspected.",
      ],
      recall: [
        {
          front: "State the rule of three.",
          back:
            "If a class needs a custom destructor, copy constructor or copy assignment, it almost " +
            "always needs all three, because it manages a resource.",
        },
        {
          front: "What is the rule of zero, and why is it preferred?",
          back:
            "Own resources only through RAII members and declare none of the special members; the " +
            "compiler-generated ones are then correct by construction.",
        },
        {
          front: "Which bugs does AddressSanitizer catch, and at what cost?",
          back:
            "Heap and stack buffer overflows, use-after-free, double free, and leaks at exit — at " +
            "roughly 2× slowdown, cheap enough for a CI test run.",
        },
        {
          front: "Why can declaring a destructor make a class slower to move?",
          back: "It suppresses the implicit move operations, so moves silently fall back to copies.",
        },
      ],
      resources: [
        {
          title: "cppreference — The rule of three/five/zero",
          url: "https://en.cppreference.com/cpp/language/rule_of_three",
          kind: "docs",
          minutes: 20,
          whyThisOne:
            "All three rules on one page, with the canonical example for each.",
          steps: [
            "Read the three rules and their examples.",
            "Write a class owning a raw `new[]` buffer that breaks the rule of three, and copy it.",
            "Compile with `-fsanitize=address -g` and read the report (next link explains the output).",
            "Fix it by switching to `vector` — the rule of zero.",
          ],
          isPrimary: true,
        },
        {
          title: "Clang — AddressSanitizer",
          url: "https://clang.llvm.org/docs/AddressSanitizer.html",
          kind: "docs",
          whyThisOne:
            "Flags, what it detects, and how to read its reports; the same flags work with GCC.",
        },
        {
          title: "Valgrind — Quick start",
          url: "https://valgrind.org/docs/manual/quick-start.html",
          kind: "lab",
          whyThisOne:
            "Memcheck on an existing binary in five minutes.",
        },
      ],
    },
  ],
};
