const assert = require("node:assert/strict");
const { test } = require("node:test");
const { renderToStaticMarkup } = require("react-dom/server");
const { createElement } = require("react");
const { loader } = require("./helpers.cjs");
const id = "00000000-0000-0000-0000-000000000001";
const other = "00000000-0000-0000-0000-000000000002";
const oldPath = `${id}/00000000-0000-0000-0000-000000000003.png`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p1sAAAAASUVORK5CYII=", "base64");

function setup(options = {}) {
  const calls = [];
  const storage = {
    upload: async (path) => { calls.push(["upload", path]); return { error: options.uploadError ? Error("upload failed") : null }; },
    remove: async (paths) => { calls.push(["remove", ...paths]); return { error: null }; },
    createSignedUrl: async (path) => { calls.push(["sign", path]); return { data: { signedUrl: "https://storage.example/signed-picture" }, error: options.signError ? Error("sign failed") : null }; },
  };
  const supabase = {
    auth: { getUser: async () => ({ data: { user: options.signedOut ? null : { id } }, error: null }) },
    storage: { from: bucket => { assert.equal(bucket, "profile-pictures"); return storage; } },
    from: table => {
      assert.equal(table, "profiles");
      return {
        select: () => ({ eq: (key, value) => { assert.equal(key, "id"); assert.equal(value, id); return { maybeSingle: async () => ({ data: { avatar_path: options.avatarPath ?? null }, error: null }) }; } }),
        update: values => { calls.push(["update", values]); return { eq: (key, value) => { assert.equal(key, "id"); assert.equal(value, id); return { select: () => ({ single: async () => ({ data: { id }, error: options.saveError ? (typeof options.saveError === "object" ? options.saveError : Error("save failed")) : null }) }) }; } }; },
      };
    },
  };
  const module = loader({
    "@/lib/supabase/server": { createSupabaseServerClient: async () => supabase },
    "@/lib/rate-limit.server": { checkRateLimit: () => ({ allowed: true }) },
  })("src/app/api/profile/route.ts");
  const form = new FormData(); form.set("displayName", " Learner "); form.set("name", " Personal Name "); form.set("showName", "false"); form.set("aboutMe", " I like Python. ");
  const request = { headers: new Headers({ origin: "https://practice.example" }), nextUrl: new URL("https://practice.example/api/profile"), formData: async () => form };
  return { calls, form, request, post: () => module.POST(request) };
}

test("profile text allows clearing a biography and rejects empty or oversized names", () => {
  const { validateProfileText } = loader()("src/lib/profile.ts");
  assert.equal(validateProfileText(" Handle ", " Name ", false, "").aboutMe, "");
  assert.equal(validateProfileText(" Handle ", " Name ", false, " Hi ").displayName, "Handle");
  for (const name of [" ", "a".repeat(61), null]) assert.throws(() => validateProfileText(name, "Name", false, ""), /Display name must/);
  assert.throws(() => validateProfileText("Handle", "Name", false, "a".repeat(1001)), /About me/);
});

test("picture validation checks file bytes, size, and ownership rather than filenames", async () => {
  const { validateAvatar, isOwnAvatarPath, MAX_AVATAR_BYTES } = loader()("src/lib/profile.ts");
  assert.equal(await validateAvatar(new File([png], "picture.png", { type: "image/png" })), "png");
  await assert.rejects(validateAvatar(new File(["<script>bad</script>"], "fake.png", { type: "image/png" })), /valid JPG/);
  await assert.rejects(validateAvatar(new File([png], "avatar.svg", { type: "image/svg+xml" })), /valid JPG/);
  await assert.rejects(validateAvatar(new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], "huge.png", { type: "image/png" })), /2 MB/);
  assert.equal(isOwnAvatarPath(oldPath, id), true);
  assert.equal(isOwnAvatarPath(oldPath, other), false);
  assert.equal(isOwnAvatarPath(`${id}/../another.png`, id), false);
  assert.equal(isOwnAvatarPath("https://example.com/avatar.png", id), false);
});

test("profile API requires authentication and rejects requests from another origin", async () => {
  const signedOut = setup({ signedOut: true });
  assert.equal((await signedOut.post()).status, 401); assert.equal(signedOut.calls.length, 0);
  const foreign = setup(); foreign.request.headers.set("origin", "https://attacker.example");
  assert.equal((await foreign.post()).status, 403); assert.equal(foreign.calls.length, 0);
});

test("saving name and biography updates only the authenticated account and editable columns", async () => {
  const { post, form, calls } = setup();
  form.set("role", "admin"); form.set("userId", other); form.set("avatar_path", `${other}/not-mine.png`);
  const response = await post(); assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.displayName, "Learner"); assert.equal(result.fullName, "Personal Name"); assert.equal(result.showName, false); assert.equal(result.aboutMe, "I like Python.");
  const values = calls.find(call => call[0] === "update")[1];
  assert.equal(values.display_name, "Learner"); assert.equal(values.full_name, "Personal Name"); assert.equal(values.show_name, false);
  assert.equal("role" in values, false); assert.equal("userId" in values, false); assert.equal(values.avatar_path, null);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("invalid profile input does not upload a picture or update the profile", async () => {
  const form = setup(); form.form.set("aboutMe", "x".repeat(1001));
  assert.equal((await form.post()).status, 400); assert.equal(form.calls.length, 0);
  const invalid = setup(); invalid.form.set("avatar", new File(["bad"], "fake.png", { type: "image/png" }));
  assert.equal((await invalid.post()).status, 400); assert.equal(invalid.calls.length, 0);
});

test("picture replacement saves before deleting the old picture", async () => {
  const { post, form, calls } = setup({ avatarPath: oldPath });
  form.set("avatar", new File([png], "my-picture.png", { type: "image/png" }));
  const response = await post(); assert.equal(response.status, 200);
  const upload = calls.find(call => call[0] === "upload")[1];
  assert.match(upload, new RegExp(`^${id}/[0-9a-f-]+[.]png$`)); assert.notEqual(upload, oldPath);
  const updatePosition = calls.findIndex(call => call[0] === "update");
  const removalPosition = calls.findIndex(call => call[0] === "remove");
  assert.ok(updatePosition < removalPosition); assert.equal(calls[removalPosition][1], oldPath);
  assert.equal((await response.json()).hasAvatar, true);
});

test("a failed profile save discards only the new upload and keeps the old picture", async () => {
  const { post, form, calls } = setup({ avatarPath: oldPath, saveError: true });
  form.set("avatar", new File([png], "picture.png", { type: "image/png" }));
  assert.equal((await post()).status, 500);
  const upload = calls.find(call => call[0] === "upload")[1];
  assert.equal(calls.find(call => call[0] === "remove")[1], upload);
  assert.equal(calls.some(call => call[0] === "remove" && call[1] === oldPath), false);
});

test("upload and signing failures leave the saved profile untouched", async () => {
  for (const options of [{ uploadError: true }, { signError: true }]) {
    const { post, form, calls } = setup(options); form.set("avatar", new File([png], "picture.png", { type: "image/png" }));
    assert.equal((await post()).status, 502); assert.equal(calls.some(call => call[0] === "update"), false);
    if (options.signError) assert.equal(calls.some(call => call[0] === "remove"), true);
  }
});

test("removing a picture clears its profile reference before cleanup", async () => {
  const { post, form, calls } = setup({ avatarPath: oldPath }); form.set("removeAvatar", "true");
  const response = await post(); assert.equal(response.status, 200);
  assert.equal(calls.find(call => call[0] === "update")[1].avatar_path, null);
  assert.equal(calls.find(call => call[0] === "remove")[1], oldPath);
  const result = await response.json(); assert.equal(result.hasAvatar, false); assert.equal(result.avatarUrl, null);
});

test("profile has a labeled biography field and explicit Save profile button", () => {
  const { ProfileEditor } = loader({ "next/navigation": { useRouter: () => ({ refresh() {} }) } })("src/components/profile-editor.tsx");
  const html = renderToStaticMarkup(createElement(ProfileEditor, { email: "learner@example.com", initialProfile: { displayName: "Learner", fullName: "Personal Name", showName: false, aboutMe: "Learning Python", avatarUrl: null, hasAvatar: false } }));
  assert.match(html, /About me/); assert.match(html, /Learning Python/); assert.match(html, /Save profile/); assert.match(html, /Add profile picture/);
  assert.doesNotMatch(html, /JPG, PNG, or WebP · Up to 2 MB/);
});

test("registration shows a required Full name text box with the profile length limit", () => {
  const { LoginForm } = loader({ "next/navigation": { useRouter: () => ({}) } })("src/components/login-form.tsx");
  const html = renderToStaticMarkup(createElement(LoginForm, { initialMode: "register" }));
  assert.match(html, />Full name<\/span>/); assert.match(html, />Display name<\/span>/); assert.match(html, /autoComplete="nickname"/); assert.match(html, /maxLength="60"/); assert.match(html, /autoComplete="name"/);
  assert.equal((html.match(/<input[^>]*required=""/g) ?? []).length, 4);
});


test("duplicate display names return a conflict and discard only the new picture", async () => {
  const { post, form, calls } = setup({ avatarPath: oldPath, saveError: { code: "23505" } });
  form.set("avatar", new File([png], "picture.png", { type: "image/png" }));
  const response = await post(); assert.equal(response.status, 409); assert.match((await response.json()).error, /already taken/);
  const upload = calls.find(call => call[0] === "upload")[1];
  assert.equal(calls.find(call => call[0] === "remove")[1], upload);
  assert.equal(calls.some(call => call[0] === "remove" && call[1] === oldPath), false);
});
