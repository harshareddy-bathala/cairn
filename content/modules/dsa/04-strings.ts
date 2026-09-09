import type { Module } from "@/content/types";

export const strings: Module = {
  slug: "dsa-strings",
  trackSlug: "dsa",
  phaseSlug: "foundations",
  order: 4,
  title: "Strings",
  summary:
    "Rarely the hard part of an interview, frequently the warm-up. Being fluent here buys you calm in the first ten minutes, which is worth more than it sounds.",
  prereqSlugs: ["dsa-arrays-sorting"],
  units: [
    {
      slug: "dsa-strings-cpp",
      title: "Strings in C++ without surprises",
      objective:
        "Manipulate std::string confidently and avoid the copy and indexing traps.",
      estMinutes: 45,
      conceptMd: `\`std::string\` is a \`vector<char>\` with extra methods. \`substr(pos, len)\` **copies** — calling it inside a loop is a quiet O(n²).

Useful and often forgotten: \`find\` returns \`string::npos\` (not \`-1\`) when absent, \`stoi\`/\`to_string\` convert, \`+=\` appends cheaply while \`s = s + c\` may reallocate, and \`isalnum\`/\`tolower\` from \`<cctype>\` save hand-rolled character checks.

For building a result, \`reserve()\` the expected size and \`push_back\`. For splitting on a delimiter, \`istringstream\` plus \`getline(ss, token, ',')\` is the idiomatic route.`,
      resources: [
        {
          title: "cppreference — std::string",
          url: "https://en.cppreference.com/w/cpp/string/basic_string",
          kind: "docs",
          minutes: 20,
          whyThisOne: "Skim the method list once so you stop reimplementing things that already exist.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-strings-two-pointer",
      title: "Two-pointer string patterns",
      objective:
        "Reverse words, check palindromes with filtering, and compare strings in place.",
      estMinutes: 60,
      conceptMd: `Strings are arrays, so every array two-pointer technique transfers directly.

**Valid palindrome with filtering** is the canonical version: converge from both ends, skipping non-alphanumeric characters, comparing lowercased. The bug to avoid is advancing a pointer past the other — guard with \`while (l < r && !isalnum(s[l])) l++\`.

**Reverse words** has a neat in-place trick: reverse the entire string, then reverse each word individually. Handling arbitrary runs of spaces while doing it is the actual difficulty, and it is a fair interview question precisely because of that.`,
      resources: [
        {
          title: "Striver A2Z — Step 5: strings",
          url: "https://takeuforward.org/data-structure/reverse-words-in-a-string/",
          kind: "do",
          minutes: 45,
          whyThisOne: "The sheet's string tier in order; short enough to clear in two sittings.",
          isPrimary: true,
        },
      ],
    },
    {
      slug: "dsa-strings-frequency",
      title: "Anagrams, frequency & grouping",
      objective:
        "Use a 26-slot count array over a hash map when the alphabet is fixed, and justify why.",
      estMinutes: 60,
      conceptMd: `When the alphabet is known and small, \`int cnt[26]\` beats \`unordered_map\` on both constant factor and cache behaviour. Saying that out loud in an interview reads as someone who thinks about machines, not just asymptotics.

**Grouping anagrams** needs a canonical key per word. Two options: the sorted word — O(k log k) per word — or the 26-length count vector serialised to a string, which is O(k). The second is the better answer when words are long.

**Sort characters by frequency** is a count plus a sort of (char, count) pairs, or a bucket by count when you want O(n).`,
      resources: [
        {
          title: "Striver — sort characters by frequency",
          url: "https://takeuforward.org/data-structure/sort-characters-by-frequency/",
          kind: "watch",
          minutes: 20,
          whyThisOne: "Covers the counting-plus-ordering shape that the whole family reuses.",
          isPrimary: true,
        },
        {
          title: "NeetCode — Group Anagrams",
          url: "https://neetcode.io/problems/anagram-groups",
          kind: "watch",
          minutes: 15,
          whyThisOne: "Explains the canonical-key idea better than most, which is the transferable part.",
        },
      ],
    },
    {
      slug: "dsa-strings-parsing",
      title: "Parsing, tokenising & sliding windows",
      objective:
        "Implement atoi with full edge-case handling, and solve the longest-unique-substring window.",
      estMinutes: 75,
      conceptMd: `**atoi** is an edge-case exercise disguised as a parsing exercise: leading whitespace, an optional sign, digits until a non-digit, and **clamping on overflow** rather than wrapping. Check overflow *before* multiplying — \`if (res > (INT_MAX - d) / 10) return sign > 0 ? INT_MAX : INT_MIN;\`. Interviewers ask it to see whether you volunteer the edge cases unprompted.

**Sliding window** on strings: expand \`right\` always; when the window becomes invalid, advance \`left\` until it is valid again. Each index enters and leaves once, so it is O(n) despite the nested loop appearance.

For longest-substring-without-repeats, keep \`lastSeen[c]\`; when you meet a repeat inside the current window, jump \`left\` to \`lastSeen[c] + 1\` rather than stepping one at a time.`,
      resources: [
        {
          title: "NeetCode — Sliding window",
          url: "https://neetcode.io/courses/advanced-algorithms/5",
          kind: "watch",
          minutes: 30,
          whyThisOne: "The clearest statement of the expand/contract invariant, which is the whole technique.",
          isPrimary: true,
        },
      ],
    },
  ],
  problems: [
    { slug: "lc-valid-palindrome", title: "Valid Palindrome", platform: "leetcode", url: "https://leetcode.com/problems/valid-palindrome/", difficulty: "easy", patternTag: "two-pointers", triggerHint: "Symmetry check with characters to ignore.", approachHint: "Converge from both ends, skipping non-alphanumerics. Guard the skip loops with l < r.", estMinutes: 15, unitSlug: "dsa-strings-two-pointer" },
    { slug: "lc-reverse-words", title: "Reverse Words in a String", platform: "leetcode", url: "https://leetcode.com/problems/reverse-words-in-a-string/", difficulty: "medium", patternTag: "string-manipulation", triggerHint: "Word-level reordering with messy whitespace.", approachHint: "Reverse the whole string, then reverse each word. The space handling is the real work.", estMinutes: 25, unitSlug: "dsa-strings-two-pointer" },
    { slug: "lc-longest-common-prefix", title: "Longest Common Prefix", platform: "leetcode", url: "https://leetcode.com/problems/longest-common-prefix/", difficulty: "easy", patternTag: "string-manipulation", triggerHint: "Shared leading run across many strings.", approachHint: "Take the first string as the candidate and shorten it against each other string. Stop early when empty.", estMinutes: 15, unitSlug: "dsa-strings-cpp" },
    { slug: "lc-largest-odd-number", title: "Largest Odd Number in String", platform: "leetcode", url: "https://leetcode.com/problems/largest-odd-number-in-string/", difficulty: "easy", patternTag: "greedy", triggerHint: "Longest prefix ending on an odd digit.", approachHint: "Scan from the right for the first odd digit; the answer is the prefix up to and including it.", estMinutes: 10, unitSlug: "dsa-strings-cpp" },
    { slug: "lc-isomorphic-strings", title: "Isomorphic Strings", platform: "leetcode", url: "https://leetcode.com/problems/isomorphic-strings/", difficulty: "easy", patternTag: "frequency-map", triggerHint: "A consistent one-to-one character mapping.", approachHint: "Two maps, both directions. A single map wrongly accepts 'ab' -> 'aa'.", estMinutes: 20, unitSlug: "dsa-strings-frequency" },
    { slug: "lc-group-anagrams", title: "Group Anagrams", platform: "leetcode", url: "https://leetcode.com/problems/group-anagrams/", difficulty: "medium", patternTag: "frequency-map", triggerHint: "Bucket items by an equivalence relation.", approachHint: "Build a canonical key per word — sorted word, or the 26-count vector serialised — and map key to list.", estMinutes: 25, unitSlug: "dsa-strings-frequency" },
    { slug: "lc-sort-chars-by-frequency", title: "Sort Characters By Frequency", platform: "leetcode", url: "https://leetcode.com/problems/sort-characters-by-frequency/", difficulty: "medium", patternTag: "frequency-map", triggerHint: "Reorder by count rather than by value.", approachHint: "Count, then sort pairs by count descending — or bucket by count for O(n).", estMinutes: 20, unitSlug: "dsa-strings-frequency" },
    { slug: "lc-roman-to-integer", title: "Roman to Integer", platform: "leetcode", url: "https://leetcode.com/problems/roman-to-integer/", difficulty: "easy", patternTag: "parsing", triggerHint: "Symbol decoding with a local exception rule.", approachHint: "Add each value, but subtract instead when the current symbol is smaller than the next one.", estMinutes: 20, unitSlug: "dsa-strings-parsing" },
    { slug: "lc-string-to-integer-atoi", title: "String to Integer (atoi)", platform: "leetcode", url: "https://leetcode.com/problems/string-to-integer-atoi/", difficulty: "medium", patternTag: "parsing", triggerHint: "Specification-heavy parsing with overflow clamping.", approachHint: "Whitespace, sign, digits, stop at non-digit. Check overflow BEFORE multiplying and clamp to INT_MAX/INT_MIN.", estMinutes: 30, unitSlug: "dsa-strings-parsing" },
    { slug: "lc-longest-substring-no-repeat", title: "Longest Substring Without Repeating Characters", platform: "leetcode", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/", difficulty: "medium", patternTag: "sliding-window", triggerHint: "Longest window satisfying a uniqueness constraint.", approachHint: "Expand right; on a repeat inside the window, jump left to lastSeen[c]+1. Track the max length.", estMinutes: 30, unitSlug: "dsa-strings-parsing" },
    { slug: "lc-longest-palindromic-substring", title: "Longest Palindromic Substring", platform: "leetcode", url: "https://leetcode.com/problems/longest-palindromic-substring/", difficulty: "medium", patternTag: "expand-around-centre", triggerHint: "Longest symmetric substring.", approachHint: "Expand around each of the 2n-1 centres — n single characters and n-1 gaps. O(n^2) time, O(1) space.", estMinutes: 30, unitSlug: "dsa-strings-two-pointer" },
    { slug: "lc-find-first-occurrence", title: "Find the Index of the First Occurrence in a String", platform: "leetcode", url: "https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/", difficulty: "easy", patternTag: "pattern-matching", triggerHint: "Substring search.", approachHint: "The naive O(nm) scan is accepted. Know that KMP exists and gives O(n+m); implementing it is optional at this stage.", estMinutes: 20, unitSlug: "dsa-strings-parsing" },
  ],
};
