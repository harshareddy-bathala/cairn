import { cn } from "@/lib/cn";
import { safeUrl } from "@/lib/safe-url";

/**
 * A deliberately small markdown renderer for unit concept notes. Supports only
 * what the content actually uses: paragraphs, fenced code, inline code, bold,
 * italics, links, tables and bullet lists. No dependency: React escapes every
 * text node, and link hrefs are scheme-checked, so there is no sanitiser gap
 * even if this is ever pointed at text a person typed.
 */
function inline(s: string, key: string) {
  const nodes: React.ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) nodes.push(s.slice(last, m.index));
    const t = m[0];
    // Bold and italics recurse, so `code` inside **bold** is still a chip rather
    // than literal backticks. Code itself is a leaf: nothing inside it is markup.
    if (t.startsWith("`")) nodes.push(<code key={`${key}-${i}`}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("**"))
      nodes.push(<strong key={`${key}-${i}`}>{inline(t.slice(2, -2), `${key}-${i}b`)}</strong>);
    else if (t.startsWith("[")) {
      const [, label, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!;
      // The concept notes are our own content, but this is the one place the
      // renderer turns text into an href — so the scheme is checked regardless.
      // A rejected link degrades to its label rather than disappearing.
      const safe = safeUrl(href);
      nodes.push(
        safe ? (
          <a key={`${key}-${i}`} href={safe} target="_blank" rel="noreferrer noopener">
            {label}
          </a>
        ) : (
          <span key={`${key}-${i}`}>{label}</span>
        ),
      );
    } else nodes.push(<em key={`${key}-${i}`}>{inline(t.slice(1, -1), `${key}-${i}e`)}</em>);
    last = m.index + t.length;
    i++;
  }
  if (last < s.length) nodes.push(s.slice(last));
  return nodes;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.split("\n");
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      blocks.push(
        <pre
          key={k++}
          className="overflow-x-auto rounded-[3px] border border-line-soft bg-ink-900/70 p-3"
        >
          {lang && <span className="legend mb-1.5 block">{lang}</span>}
          <code className="block whitespace-pre text-2xs leading-relaxed text-mid">
            {body.join("\n")}
          </code>
        </pre>,
      );
      continue;
    }

    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^-+$/.test(c.replace(/:/g, "")) || c === "")) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={k++} className="overflow-x-auto">
          <table className="w-full border-collapse text-2xs">
            <thead>
              <tr>
                {head.map((c, j) => (
                  <th key={j} className="border-b border-line px-2 py-1.5 text-left font-normal">
                    <span className="legend">{c}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} className="border-b border-line-soft px-2 py-1.5 align-top text-mid">
                      {inline(c, `t${k}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) items.push(lines[i++].slice(2));
      blocks.push(
        <ul key={k++} className="ml-4 list-disc space-y-1 marker:text-lo">
          {items.map((it, j) => (
            <li key={j}>{inline(it, `l${k}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i]))
        items.push(lines[i++].replace(/^\d+\. /, ""));
      blocks.push(
        <ol key={k++} className="ml-4 list-decimal space-y-1 marker:text-lo">
          {items.map((it, j) => (
            <li key={j}>{inline(it, `o${k}-${j}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(```|\||[-*] |\d+\. )/.test(lines[i]))
      para.push(lines[i++]);
    blocks.push(<p key={k++}>{inline(para.join(" "), `p${k}`)}</p>);
  }

  return <div className={cn("prose-cairn", className)}>{blocks}</div>;
}
