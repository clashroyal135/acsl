import ReactMarkdown from "react-markdown";
import { seasonLabel } from "@/lib/problem-groups";
import { Badge } from "@/components/ui/badge";
import type { Problem, StatementBlock } from "@/lib/types";

function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={{ img: ({ src, alt }) => typeof src === "string" ? <a href={src} target="_blank" rel="noreferrer" className="statement-image-link"><img src={src} alt={alt ?? "Problem diagram"} loading="lazy" className="statement-image" /></a> : null }}>{children}</ReactMarkdown>;
}

function Example({ input, output }: { input: string; output: string }) {
  return <div className="statement-example"><div><p className="statement-label">Input</p><pre className="code-block">{input}</pre></div><div><p className="statement-label">Output</p><pre className="code-block">{output}</pre></div></div>;
}

function Block({ block }: { block: StatementBlock }) {
  switch (block.type) {
    case "prose": return <Markdown>{block.markdown}</Markdown>;
    case "table": return <div className="statement-table"><table><caption>{block.caption}</caption>{block.widths && <colgroup>{block.widths.map((width, i) => <col key={i} style={{ width: `${width}%` }} />)}</colgroup>}<thead><tr>{block.columns.map((column, i) => <th key={i} scope="col">{column}</th>)}</tr></thead><tbody>{block.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}>{cell}</td>)}</tr>)}</tbody></table></div>;
    // MathML is generated from trusted, checked TeX at authoring time. User HTML is never rendered.
    case "math": return <div className="statement-equation">{block.label && <p className="statement-label">{block.label}</p>}<div dangerouslySetInnerHTML={{ __html: block.html }} /></div>;
    case "figure": return <figure className="statement-figure" style={{ width: block.displayWidth }}><a href={block.src} target="_blank" rel="noreferrer" aria-label={`Open full-size: ${block.alt}`}><img className="statement-image" src={block.src} alt={block.alt} width={block.width} height={block.height} loading="lazy" /></a></figure>;
    case "grid": return <figure className="statement-board"><figcaption>{block.caption}</figcaption><div className="statement-grid">{block.rows.flat().map((cell, i) => <span key={i}>{cell}</span>)}</div></figure>;
    case "triangle": return <figure className="statement-triangle"><figcaption>{block.caption}</figcaption>{block.rows.map((row, i) => <div className="statement-triangle-row" key={i}>{row.map((cell, j) => <span key={j}>{cell}</span>)}</div>)}</figure>;
    case "tiles": return <figure className="statement-tiles" aria-label="Example tile board">{block.rows.map((row, r) => <div className="statement-tile-row" key={r}><span className="statement-row-label">Row {r + 1}</span><div>{row.map((tile, i) => <span className={`statement-tile${tile.length === 1 ? " statement-tile-start" : ""}`} key={i}>{tile.split("").map((digit, j) => <span key={j}>{digit}</span>)}</span>)}</div></div>)}{block.discard.length > 0 && <div className="statement-tile-row"><span className="statement-row-label">Discard</span><div>{block.discard.map((tile, i) => <span className="statement-tile" key={i}>{tile.split("").map((digit, j) => <span key={j}>{digit}</span>)}</span>)}</div></div>}</figure>;
    case "example": return <Example input={block.input} output={block.output} />;
    case "clock": {
      const squares = [[2, 1, 1], [2, 0, 1], [0, 0, 2], [0, 2, 3], [3, 0, 5]];
      const colors: Record<string, string> = { R: "#ff0000", G: "#00ee00", B: "#0000ff", W: "#ffffff", C: "#00ffff", M: "#ff00ff", Y: "#ffff00" };
      return <figure className="statement-clock"><svg viewBox="-.04 -.04 8.08 5.08" role="img" aria-label={`Fibonacci clock ${block.colors}, showing ${block.time}`}>{squares.map(([x, y, side], i) => <g key={i}><rect x={x} y={y} width={side} height={side} fill={colors[block.colors[i]]} stroke="#111" strokeWidth=".04" /><text x={x + side / 2} y={y + side / 2} textAnchor="middle" dominantBaseline="central" fontSize={side === 1 ? .4 : .45} fill={block.colors[i] === "B" ? "white" : "black"}>{block.colors[i]}</text></g>)}</svg><figcaption>{block.colors} · {block.time}</figcaption></figure>;
    }
  }
}

export function ProblemStatement({ problem }: { problem: Problem }) {
  return (
    <article className="prose-acsl px-5 py-6 sm:px-7">
      <div className="mb-6 flex flex-wrap gap-2"><Badge>{seasonLabel(problem.year)}</Badge><Badge>Contest 1</Badge></div>
      <div className="statement-body">{problem.statementLayout ? problem.statementLayout.map((block, i) => <Block key={i} block={block} />) : <Markdown>{problem.statement}</Markdown>}</div>
      <Section title="Input"><Markdown>{problem.inputSpec}</Markdown></Section>
      <Section title="Output"><Markdown>{problem.outputSpec}</Markdown></Section>
      <Section title="Constraints"><ul className="space-y-2 text-sm text-muted-foreground">{problem.constraints.map((constraint) => <li key={constraint}>{constraint.replace(/^\s*[•*-]\s+/, "")}</li>)}</ul></Section>
      <Section title="Examples">{problem.samples.map((sample, index) => <div key={index} className="mb-6"><Example input={sample.input} output={sample.output} />{sample.explanation && <div className="mt-3"><p className="statement-label">Explanation</p><Markdown>{sample.explanation}</Markdown></div>}</div>)}</Section>
      <Section title="Hints"><details className="rounded-xl border border-border bg-muted/40 p-4"><summary className="cursor-pointer font-semibold">Reveal {problem.hints.length} hints</summary><ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">{problem.hints.map((hint) => <li key={hint}>{hint}</li>)}</ol></details></Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8"><h2 className="mb-3 text-lg font-bold text-foreground">{title}</h2>{children}</section>;
}
