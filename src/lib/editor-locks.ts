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
    const from = model.getPositionAt(start), to = model.getPositionAt(end);
    return {
      range: { startLineNumber: from.lineNumber, startColumn: from.column, endLineNumber: to.lineNumber, endColumn: to.column },
      options: {
        className: "acsl-locked-line", inlineClassName: "acsl-locked-text",
        // Never shade editable text sharing a line with a wrapper boundary.
        isWholeLine: false, stickiness: 1, // NeverGrowsWhenTypingAtEdges
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
