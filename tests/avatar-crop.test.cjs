const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loader } = require("./helpers.cjs");
const { squareCrop, MAX_AVATAR_ZOOM } = loader()("src/lib/avatar-crop.ts");

function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`); }

test("portrait and landscape pictures start with a centered square crop", () => {
  const landscape = squareCrop(800, 400, 1, { x: 0.5, y: 0.5 });
  near(landscape.x, 200); near(landscape.y, 0); near(landscape.size, 400);
  const portrait = squareCrop(400, 800, 1, { x: 0.5, y: 0.5 });
  near(portrait.x, 0); near(portrait.y, 200); near(portrait.size, 400);
});

test("zoom changes the crop size while keeping the subject centered", () => {
  const crop = squareCrop(800, 400, 2, { x: 0.5, y: 0.5 });
  near(crop.x, 300); near(crop.y, 100); near(crop.size, 200);
  near(crop.center.x, 0.5); near(crop.center.y, 0.5);
});

test("dragging and zooming cannot expose blank areas outside the image", () => {
  for (const [width, height] of [[1, 1], [300, 1200], [1920, 1080], [8192, 100]]) {
    for (const zoom of [-1, 1, 1.3, 2, 4, 100, NaN]) {
      for (const center of [{ x: -10, y: -10 }, { x: 0, y: 1 }, { x: 0.5, y: 0.5 }, { x: 10, y: 10 }]) {
        const crop = squareCrop(width, height, zoom, center);
        assert.ok(crop.x >= 0 && crop.y >= 0);
        assert.ok(crop.x + crop.size <= width + 0.000001);
        assert.ok(crop.y + crop.size <= height + 0.000001);
        assert.ok(crop.size >= Math.min(width, height) / MAX_AVATAR_ZOOM);
        assert.ok(crop.size <= Math.min(width, height));
      }
    }
  }
});

test("invalid image dimensions are rejected before drawing", () => {
  for (const dimensions of [[0, 300], [300, 0], [-1, 300], [NaN, 300], [Infinity, 300]]) {
    assert.throws(() => squareCrop(...dimensions, 1, { x: 0.5, y: 0.5 }), /could not be opened/);
  }
});

test("the applied crop exports the preview region as a 512-pixel PNG", async () => {
  const calls = [];
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: (...args) => calls.push(args) }), toBlob: (callback, mime) => { assert.equal(mime, "image/png"); callback(new Blob(["test pixels"], { type: mime })); } };
  const { cropAvatar } = loader({}, {}, { document: { createElement: tag => { assert.equal(tag, "canvas"); return canvas; } } })("src/lib/avatar-crop.ts");
  const image = { naturalWidth: 800, naturalHeight: 400 };
  const file = await cropAvatar(image, 2, { x: 0.5, y: 0.5 });
  assert.equal(canvas.width, 512); assert.equal(canvas.height, 512);
  assert.equal(calls[0][0], image);
  assert.deepEqual(calls[0].slice(1), [300, 100, 200, 200, 0, 0, 512, 512]);
  assert.equal(file.name, "profile-picture.png"); assert.equal(file.type, "image/png"); assert.ok(file.size > 0);
});

test("canvas failures report an error instead of producing an empty picture", async () => {
  for (const canvas of [{ getContext: () => null }, { getContext: () => ({ drawImage() {} }), toBlob: callback => callback(null) }]) {
    const { cropAvatar } = loader({}, {}, { document: { createElement: () => canvas } })("src/lib/avatar-crop.ts");
    await assert.rejects(cropAvatar({ naturalWidth: 800, naturalHeight: 400 }, 1, { x: 0.5, y: 0.5 }), /could not crop|Unable to prepare/);
  }
});
