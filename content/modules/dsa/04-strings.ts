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
      primer: `A string is text stored as a sequence of characters: \`string s = "hello";\` — \`s[0]\` is \`'h'\`, \`s.size()\` is 5. In C++ it behaves much like a \`vector<char>\` with useful extras.

The handful you will use constantly: \`s += 'x'\` to append, \`s.substr(start, length)\` to cut out a piece, \`s.find("lo")\` to search, \`to_string(42)\` and \`stoi("42")\` to convert between numbers and text, and \`isalpha\`, \`isdigit\`, \`tolower\` to test and change single characters.

Each character is also a small number (its ASCII code), which is why \`c - 'a'\` turns \`'a'..'z'\` into \`0..25\` — the trick behind counting letters in an array of 26.

**You need already:** vectors, and the learncpp string lesson from the C++ module.`,
      conceptMd: `\`std::string\` is a \`vector<char>\` with extra methods. \`substr(pos, len)\` **copies** — calling it inside a loop is a quiet O(n²).

Useful and often forgotten: \`find\` returns \`string::npos\` — the largest \`size_t\` — when absent, so test \`!= string::npos\` and never \`< 0\`. Beyond that, \`stoi\`/\`to_string\` convert, \`+=\` appends cheaply while \`s = s + c\` may reallocate, and \`isalnum\`/\`tolower\` from \`<cctype>\` save hand-rolled character checks.

For building a result, \`reserve()\` the expected size and \`push_back\`. For splitting on a delimiter, \`istringstream\` plus \`getline(ss, token, ',')\` is the idiomatic route.

The \`substr\` trap, concretely — this is O(n^2) because each call copies:

\`\`\`cpp
for (int i = 0; i < n; i++)
  if (s.substr(i, m) == t) { }          // copies m chars, n times

for (int i = 0; i + m <= n; i++)
  if (s.compare(i, m, t) == 0) { }      // compares in place, no copy
\`\`\`

**Splitting on a delimiter** has no built-in, so learn one route and keep it:

\`\`\`cpp
istringstream ss(line);
string tok;
while (getline(ss, tok, ',')) parts.push_back(tok);
\`\`\`

Two more that come up: \`s.back()\` on an empty string is undefined behaviour, so check \`!s.empty()\` first; and a \`char\` is an integer, so \`s[i] - '0'\` gives the digit and \`s[i] - 'a'\` gives the 0..25 index every frequency array is built on.`,
      interviewAngle:
        "Strings are the warm-up, so fluency here buys calm in the first ten minutes. A hidden " +
        "`substr` in a loop is the one thing that turns an easy question into a timeout.",
      pitfalls: [
        "Calling `substr` inside a loop. Each call copies, so a scan that looks linear is " +
          "quietly O(n^2) — use `compare(i, m, t)` to compare in place.",
        "Testing `s.find(t) < 0` or `if (s.find(t))`. The result is an unsigned `size_t`: " +
          "`< 0` is never true, and a match at index 0 reads as false. Compare with " +
          "`!= string::npos`.",
        "Reading `substr(pos, len)` as `substr(begin, end)`. The second argument is a length.",
      ],
      recall: [
        {
          front:
            "Why is `if (s.substr(i, m) == t)` inside a loop a performance bug, and what " +
            "replaces it?",
          back:
            "`substr` copies m characters on every call, making the scan O(n*m) in allocations. " +
            "`s.compare(i, m, t) == 0` compares in place with no copy.",
        },
        {
          front:
            "What does `s.find(t)` return when the substring is absent, and why is " +
            "`if (s.find(t) < 0)` a bug?",
          back:
            "It returns `string::npos`, the maximum value of the unsigned `size_t`. An " +
            "unsigned value is never below zero, so the test is always false and the miss goes " +
            "undetected. Compare with `!= string::npos`.",
        },
        {
          front: "What are the two arguments to `substr`?",
          back: "A position and a *length* — not a start and an end index.",
        },
      ],
      resources: [
        {
          title: "Striver — String basics: traversal, search, frequency, reverse",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/string-introduction-vowels-consonants-search-frequency-reverse-and-case-conversion",
          kind: "read",
          minutes: 30,
          whyThisOne:
            "One page of the everyday string operations, each done by walking the characters one at a time.",
          steps: [
            "Read the examples, then **Approach : Basic Character-by-Character Traversal** and its **Dry Run**.",
            "Type out the solution and change it: count vowels, then reverse the string, then flip the case.",
            "Read the **FAQs** at the end.",
          ],
          isPrimary: true,
        },
        {
          title: "cppreference — std::basic_string (member functions)",
          url: "https://en.cppreference.com/cpp/string/basic_string",
          kind: "docs",
          whyThisOne:
            "The full method list. Skim the *Operations* and *Search* groups once so you stop rewriting what already exists.",
        },
      ],
    },
    {
      slug: "dsa-strings-two-pointer",
      title: "Two-pointer string patterns",
      objective:
        "Reverse words, check palindromes with filtering, and compare strings in place.",
      estMinutes: 60,
      primer: `A string is an array of characters, so the two-pointer idea from the arrays module works unchanged.

A **palindrome** reads the same both ways: "racecar". To check one, put a pointer at each end, compare, and move both inward. The interview version adds noise — "A man, a plan, a canal: Panama" — so you skip anything that is not a letter or digit and compare in lowercase.

**Reversing the words** of a sentence ("the sky is blue" → "blue is sky the") has a neat trick: reverse the whole string, then reverse each word back.

**You need already:** two pointers from the arrays module, and basic string operations.`,
      conceptMd: `Strings are arrays, so every array two-pointer technique transfers directly.

**Valid palindrome with filtering** is the canonical version: converge from both ends, skipping non-alphanumeric characters, comparing lowercased. The bug to avoid is advancing a pointer past the other — guard with \`while (l < r && !isalnum(s[l])) l++\`.

**Reverse words** has a neat in-place trick: reverse the entire string, then reverse each word individually. Handling arbitrary runs of spaces while doing it is the actual difficulty, and it is a fair interview question precisely because of that.

The palindrome-with-filtering loop, written so the guards are visible:

\`\`\`cpp
int l = 0, r = s.size() - 1;
while (l < r) {
  while (l < r && !isalnum((unsigned char)s[l])) l++;
  while (l < r && !isalnum((unsigned char)s[r])) r--;
  if (tolower((unsigned char)s[l]) != tolower((unsigned char)s[r])) return false;
  l++; r--;
}
return true;
\`\`\`

Every inner \`while\` repeats the \`l < r\` test — without it a string of only punctuation walks a pointer off the end. The \`(unsigned char)\` cast is not decoration either: passing a negative \`char\` to \`isalnum\` is undefined behaviour, which is a genuinely obscure bug on inputs with non-ASCII bytes.

**Palindrome with one deletion allowed** is the natural follow-up: converge as normal, and on the first mismatch return \`isPalindrome(l+1, r) || isPalindrome(l, r-1)\`. Still O(n), because that branch happens at most once.`,
      interviewAngle:
        "Valid Palindrome with filtering is a standard opener, and the follow-up is `now allow " +
        "one deletion`. Both are two pointers; the second is one extra branch.",
      pitfalls: [
        "Omitting `l < r` from the inner skip loops. A string of pure punctuation walks a " +
          "pointer off the end.",
        "Passing a plain `char` to `isalnum` or `tolower`. A negative value is undefined " +
          "behaviour — cast to `unsigned char` first.",
        "Assuming the one-deletion variant needs a second full algorithm. It is the same " +
          "converge, with one branch on the first mismatch.",
      ],
      recall: [
        {
          front:
            "In the filtered-palindrome loop, why does every inner skip loop repeat the `l < r` " +
            "test?",
          back:
            "Without it, an input made entirely of non-alphanumeric characters advances a " +
            "pointer past the other and off the end of the string.",
        },
        {
          front: "Why cast to `unsigned char` before calling `isalnum` or `tolower`?",
          back:
            "Those functions are undefined for negative values other than EOF, and plain `char` " +
            "is signed on most platforms — so non-ASCII bytes are undefined behaviour.",
        },
        {
          front: "How do you allow one deletion in a palindrome check while staying O(n)?",
          back:
            "Converge normally; on the first mismatch return `isPalindrome(l + 1, r) || " +
            "isPalindrome(l, r - 1)`. That branch can only happen once, so the cost stays " +
            "linear.",
        },
        {
          front: "What is the in-place trick for reversing the words of a string?",
          back:
            "Reverse the entire string, then reverse each word individually. The difficulty is " +
            "handling arbitrary runs of spaces, which is why it is a fair question.",
        },
      ],
      resources: [
        {
          title: "Striver — Check whether a string is a palindrome",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/check-whether-a-string-is-a-palindrome",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "Reverse-and-compare first, then the two-pointer version that uses no extra space.",
          steps: [
            "Read **Brute: Reverse the String**, then **Optimal: Two Pointer Approach** and its **Dry Run**.",
            "Extend your version to skip non-letters and ignore case — that is LeetCode's *Valid Palindrome*.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Reverse every word in a string",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/reverse-every-word-in-a-string",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "Reverse the whole, then each word, with runs of spaces handled — the two-pointer string question that keeps being asked.",
          steps: [
            "Try it, then read **Optimal Approach** and the follow-up about spaces.",
          ],
        },
      ],
    },
    {
      slug: "dsa-strings-frequency",
      title: "Anagrams, frequency & grouping",
      objective:
        "Use a 26-slot count array over a hash map when the alphabet is fixed, and justify why.",
      estMinutes: 60,
      primer: `Many string questions reduce to **counting characters**. Two words are *anagrams* ("listen", "silent") exactly when they use the same letters the same number of times.

For lowercase English letters you do not need a map: an array \`int cnt[26]\` works, with \`cnt[c - 'a']++\` for each character. It is simpler and faster than \`unordered_map\`.

To **group** anagrams, give each word a *key* that all its anagrams share — the word with its letters sorted ("listen" → "eilnst"), or its 26 counts written out — and put words with the same key into the same bucket of a map.

**You need already:** maps, and the \`c - 'a'\` trick from the first strings unit.`,
      conceptMd: `When the alphabet is known and small, \`int cnt[26]\` beats \`unordered_map\` on both constant factor and cache behaviour. Saying that out loud in an interview reads as someone who thinks about machines, not just asymptotics.

**Grouping anagrams** needs a canonical key per word. Two options: the sorted word — O(k log k) per word — or the 26-length count vector serialised to a string, which is O(k). The second is the better answer when words are long.

**Sort characters by frequency** is a count plus a sort of (char, count) pairs, or a bucket by count when you want O(n).

The two canonical keys, side by side:

\`\`\`cpp
string k1 = w; sort(k1.begin(), k1.end());            // O(k log k)

string k2(26, '0');                                    // O(k)
for (char c : w) k2[c - 'a']++;
\`\`\`

\`k2\` works because two anagrams have identical counts. Watch the ceiling though: storing a count as a single \`char\` breaks past 9 occurrences of one letter, so use a separator or a \`vector<int>\` key when words can be long.

**Anagram check without extra passes:** if the lengths differ they cannot be anagrams — test that first and return early. It is one line, and interviewers do notice when it is missing.

The 26-slot assumption is worth stating out loud rather than assuming: it holds for lowercase ASCII only. Unicode, mixed case, or arbitrary bytes need the map, and saying "I am assuming lowercase a-z, otherwise I would use a hash map" is exactly the sentence that makes the choice look deliberate.`,
      interviewAngle:
        "Group Anagrams is really `design a canonical key`. Naming the alphabet assumption out " +
        "loud — `I am assuming lowercase a-z, otherwise a hash map` — is what makes the 26-slot " +
        "choice look deliberate rather than lucky.",
      pitfalls: [
        "Serialising counts into a `string` one char per letter. That breaks past 9 " +
          "occurrences of a letter — use a separator or a `vector<int>` key.",
        "Skipping the length check on an anagram test. Different lengths cannot be anagrams, " +
          "and the missing early return gets noticed.",
        "Using one map for Isomorphic Strings. A single direction wrongly accepts `ab` " +
          "mapping to `aa`; you need both directions.",
        "Assuming the 26-slot array without saying so. It only holds for lowercase ASCII.",
      ],
      recall: [
        {
          front:
            "Why prefer `int cnt[26]` over `unordered_map<char,int>` when the alphabet is " +
            "known?",
          back:
            "Better constant factor and cache behaviour — no hashing, no nodes, contiguous " +
            "memory. Asymptotically the same, but it is the answer that shows you think about " +
            "machines.",
        },
        {
          front:
            "Two canonical keys for grouping anagrams — what are they and when does each win?",
          back:
            "The sorted word, O(k log k) per word, and the 26-length count vector serialised, " +
            "O(k). The count key wins when words are long.",
        },
        {
          front: "Why does Isomorphic Strings need two maps rather than one?",
          back:
            "One direction only enforces that each source character maps consistently. Without " +
            "the reverse map, two different source characters can both map to the same target — " +
            "`ab` to `aa` would pass.",
        },
      ],
      resources: [
        {
          title: "Striver — Check if two strings are anagrams",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/check-if-two-strings-are-anagrams",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "The counting idea at its simplest: sorting first, then a count array that does the same job in O(n).",
          steps: [
            "Read **Brute: Sorting**, then **Optimal: Frequency Counting** and its **Dry Run**.",
            "Read the **FAQs** — the different-lengths case is the usual slip.",
            "Then open *Group Anagrams* below.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Group anagrams",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/group-anagrams",
          kind: "do",
          minutes: 30,
          whyThisOne:
            "Choosing a key that every anagram shares — the idea that carries over to other grouping problems.",
          steps: [
            "Compare the sorted-word key with the count key in **Better** vs **Optimal**.",
          ],
        },
        {
          title: "Striver — Sort characters by frequency",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/sort-characters-by-frequency",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "Counting followed by ordering — the shape the rest of the family reuses.",
        },
      ],
    },
    {
      slug: "dsa-strings-parsing",
      title: "Parsing, tokenising & sliding windows",
      objective:
        "Implement atoi with full edge-case handling, and solve the longest-unique-substring window.",
      estMinutes: 75,
      primer: `Two skills in this unit.

**Parsing**: turning text into a value by hand, one character at a time. "  -42abc" should become -42: skip the spaces, read the sign, read digits until something that is not a digit, and stop before the number grows too big for an \`int\`. The code is short; the point is the edge cases.

**Sliding window**: a window is a stretch \`s[left..right]\` that you slide across the string. Grow it by moving \`right\`; when it breaks a rule (say, a repeated character), shrink it by moving \`left\` until the rule holds again. Each character enters and leaves the window at most once, so it is O(n) — where checking every substring would be O(n²).

**You need already:** two pointers, and counting characters.`,
      conceptMd: `**atoi** is an edge-case exercise disguised as a parsing exercise: leading whitespace, an optional sign, digits until a non-digit, and **clamping on overflow** rather than wrapping. Check overflow *before* multiplying — \`if (res > (INT_MAX - d) / 10) return sign > 0 ? INT_MAX : INT_MIN;\`. Interviewers ask it to see whether you volunteer the edge cases unprompted.

**Sliding window** on strings: expand \`right\` always; when the window becomes invalid, advance \`left\` until it is valid again. Each index enters and leaves once, so it is O(n) despite the nested loop appearance.

For longest-substring-without-repeats, keep \`lastSeen[c]\`; when you meet a repeat inside the current window, jump \`left\` to \`lastSeen[c] + 1\` rather than stepping one at a time.`,
      interviewAngle:
        "atoi is asked to see whether you volunteer edge cases before being prompted. The " +
        "sliding window is asked to see whether you can argue O(n) despite the nested loop.",
      pitfalls: [
        "Checking for overflow after multiplying. By then it has already happened — test `res " +
          "> (INT_MAX - d) / 10` before.",
        "Wrapping on overflow instead of clamping. The specification says clamp to INT_MAX / " +
          "INT_MIN.",
        "Advancing `left` one step at a time on a repeat. Jump it to `lastSeen[c] + 1`.",
        "Jumping `left` backwards. Only move it when `lastSeen[c]` is inside the current " +
          "window, or an earlier occurrence drags the window back.",
      ],
      recall: [
        {
          front: "Why is a sliding window O(n) even though it contains a nested loop?",
          back:
            "Each index is entered by `right` once and left by `left` once, so the total " +
            "pointer movement across the whole run is 2n — the inner loop is amortised, not " +
            "multiplied.",
        },
        {
          front: "How do you test for overflow in atoi before it happens?",
          back:
            "Before `res = res * 10 + d`, check `res > (INT_MAX - d) / 10`; if so, clamp to " +
            "INT_MAX or INT_MIN according to the sign.",
        },
        {
          front:
            "In longest-substring-without-repeats, what do you do when the current character " +
            "was seen before?",
          back:
            "Jump `left` to `lastSeen[c] + 1` — but only if that is ahead of the current " +
            "`left`, or an occurrence from outside the window drags it backwards.",
        },
      ],
      resources: [
        {
          title: "Striver — Maximum sum subarray of size k",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/maximum-sum-subarray-of-size-k",
          kind: "do",
          minutes: 25,
          whyThisOne:
            "The simplest window — fixed width — so the slide-and-update idea is clear before the window starts changing size.",
          steps: [
            "Read **Brute Force**, then **Optimal Approach**, and follow its **Dry Run**.",
            "Note exactly what changes when the window moves one step: one value in, one value out.",
            "Then solve *Longest Substring Without Repeating Characters* (next link), where the window grows and shrinks.",
          ],
          isPrimary: true,
        },
        {
          title: "Striver — Longest substring without repeating characters",
          url: "https://takeuforward.org/blogs/data-structure-and-algorithm/longest-substring-without-repeating-characters",
          kind: "do",
          minutes: 35,
          whyThisOne:
            "The variable-size window: expand right, shrink left while the rule is broken.",
          steps: [
            "Read **Brute Force**, then the optimal approaches; dry-run on `\"abcabcbb\"`.",
          ],
        },
        {
          title: "GeeksforGeeks — Write your own atoi()",
          url: "https://www.geeksforgeeks.org/dsa/write-your-own-atoi/",
          kind: "read",
          minutes: 20,
          whyThisOne:
            "Parsing with every edge case listed — spaces, sign, stray characters and overflow.",
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
