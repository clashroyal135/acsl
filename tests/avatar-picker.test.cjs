const assert = require("node:assert/strict");
const { test } = require("node:test");
const React = require("react");
const { loader } = require("./helpers.cjs");

function picker(disabled = false) {
  const states = [], refs = [], effects = [], listeners = new Map();
  let stateIndex = 0, refIndex = 0, tree;
  const mockReact = { ...React,
    useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = initial; return [states[index], value => states[index] = typeof value === "function" ? value(states[index]) : value]; },
    useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial }; },
    useEffect(effect) { effects.push(effect); },
  };
  const { AvatarPicker } = loader({ react: mockReact }, {}, { window: {
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: name => listeners.delete(name),
  } })("src/components/avatar-picker.tsx");
  function render() { stateIndex = 0; refIndex = 0; tree = AvatarPicker({ disabled, hasAvatar: false, onApply() { throw Error("A drop must not save the profile automatically"); } }); }
  function nodes() { const output = []; function walk(value) { if (!value || typeof value !== "object") return; if (Array.isArray(value)) return value.forEach(walk); output.push(value); walk(value.props?.children); } walk(tree); return output; }
  function text() { function collect(value) { if (value == null || typeof value === "boolean") return ""; if (typeof value !== "object") return String(value); return Array.isArray(value) ? value.map(collect).join(" ") : collect(value.props?.children); } return collect(tree); }
  render();
  const cleanup = effects.map(effect => effect()).filter(Boolean);
  return { render, text, find: predicate => nodes().find(predicate), emit: (name, event) => listeners.get(name)?.(event), cleanup: () => cleanup.forEach(fn => fn()), listeners };
}
function event(files = [], types = ["Files"]) {
  let prevented = false;
  return { dataTransfer: { files, types, dropEffect: "none" }, preventDefault() { prevented = true; }, get prevented() { return prevented; } };
}

test("file drags show a screen-wide drop prompt and open the picture window", () => {
  const view = picker();
  assert.doesNotMatch(view.text(), /Up to 2 MB/);
  const drag = event(); view.emit("dragenter", drag); view.render();
  assert.match(view.text(), /Drop your profile picture/);
  view.emit("dragover", drag); assert.equal(drag.prevented, true); assert.equal(drag.dataTransfer.dropEffect, "copy");
  const drop = event([new File(["fixture"], "picture.png", { type: "image/png" })]);
  view.emit("drop", drop); view.render();
  assert.equal(drop.prevented, true); assert.ok(view.find(node => node.type === "dialog"));
  assert.match(view.text(), /Upload from computer/); assert.match(view.text(), /Up to 2 MB/);
  assert.doesNotMatch(view.text(), /Drop your profile picture/);
  view.cleanup(); assert.equal(view.listeners.size, 0);
});

test("ordinary text drags are unaffected and saving profiles blocks file drops", () => {
  const view = picker(); const textDrag = event([], ["text/plain"]);
  view.emit("drop", textDrag); view.render(); assert.equal(textDrag.prevented, false); assert.equal(view.find(node => node.type === "dialog"), undefined); view.cleanup();
  const disabled = picker(true); const fileDrop = event([new File(["fixture"], "picture.png")]);
  disabled.emit("drop", fileDrop); disabled.render(); assert.equal(fileDrop.prevented, true); assert.equal(disabled.find(node => node.type === "dialog"), undefined); disabled.cleanup();
});

test("multiple-file drops explain the problem and Escape cancels without applying", () => {
  const view = picker(); view.emit("drop", event([new File(["a"], "one.png"), new File(["b"], "two.png")])); view.render();
  assert.match(view.text(), /Drop one picture at a time/);
  const cancel = event(); view.find(node => node.type === "dialog").props.onCancel(cancel); view.render();
  assert.equal(cancel.prevented, true); assert.equal(view.find(node => node.type === "dialog"), undefined); view.cleanup();
});
