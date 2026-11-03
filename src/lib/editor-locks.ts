import type { editor as MonacoEditor, IDisposable } from "monaco-editor";
import type { StarterSections } from "@/lib/starters";

export function lockedCodeDecorations(model: MonacoEditor.ITextModel, template: Pick<StarterSections, "prefix" | "suffix">): MonacoEditor.IModelDeltaDecoration[] {
  const source = model.getValue();
  if (!source.startsWith(template.prefix) || !source.endsWith(template.suffix)) return [];
  const ranges = [
    [0, template.prefix.length],
    [source.length - template.suffix.length, source.length],
  ];
  return ranges.filter(([start, end]) => end > start).map(([start, end]) => {
    const first = model.getPositionAt(start);
    // A suffix newline can share the last editable line after its text. Start
    // the shading on the next line so the remaining wrapper still spans its width.
    const decorationStart = first.column !== 1 && source[start] === "\n" ? start + 1 : start;
    const from = model.getPositionAt(decorationStart), to = model.getPositionAt(end);
    // An end at column 1 belongs to the next line, which may be editable.
    const lastLine = to.column === 1 && end !== source.length ? to.lineNumber - 1 : to.lineNumber;
    const last = model.getPositionAt(end - 1);
    const wholeLines = from.column === 1 && (to.column === 1 || end === source.length);
    return {
      range: wholeLines
        ? { startLineNumber: from.lineNumber, startColumn: 1, endLineNumber: Math.max(from.lineNumber, lastLine), endColumn: lastLine === to.lineNumber ? to.column : last.column }
        : { startLineNumber: from.lineNumber, startColumn: from.column, endLineNumber: to.lineNumber, endColumn: to.column },
      options: {
        className: "acsl-locked-line", inlineClassName: "acsl-locked-text",
        // Whole-line shading includes blank wrapper lines, without leaking onto the body.
        isWholeLine: wholeLines, stickiness: 1, // NeverGrowsWhenTypingAtEdges
      },
    };
  });
}

export function trackLockedCode(editor: MonacoEditor.IStandaloneCodeEditor, template: () => Pick<StarterSections, "prefix" | "suffix">) {
  const collection = editor.createDecorationsCollection();
  const refresh = () => {
    const model = editor.getModel();
    collection.set(model ? lockedCodeDecorations(model, template()) : []);
  };
  // Read the actual model after every edit, draft restore, undo, or language change.
  // React's code state can still describe the previous model during these events.
  const listeners: IDisposable[] = [editor.onDidChangeModelContent(refresh), editor.onDidChangeModel(refresh)];
  refresh();
  return { refresh, dispose() { listeners.forEach((listener) => listener.dispose()); collection.clear(); } };
}
