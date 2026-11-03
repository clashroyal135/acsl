"use client";

import { Loader2, Pencil, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarPicker } from "@/components/avatar-picker";
import { MAX_ABOUT_ME_LENGTH, type EditableProfile } from "@/lib/profile";
import { DIVISIONS } from "@/lib/problem-groups";
import { PROGRAMMING_LANGUAGES } from "@/lib/preferences";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import type { Division, Language } from "@/lib/types";

export function ProfileEditor({ initialProfile, email, publicProfileUrl }: { initialProfile: EditableProfile; email: string; publicProfileUrl?: string }) {
  const [saved, setSaved] = useState(initialProfile);
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [name, setName] = useState(initialProfile.fullName);
  const [showName, setShowName] = useState(initialProfile.showName);
  const [aboutMe, setAboutMe] = useState(initialProfile.aboutMe);
  const [division, setDivision] = useState(initialProfile.division);
  const [preferredLanguage, setPreferredLanguage] = useState(initialProfile.preferredLanguage);
  const [editing, setEditing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => { setImageFailed(false); }, [saved.avatarUrl]);
  useEffect(() => { if (editing) nameInput.current?.focus(); }, [editing]);
  const dirty = displayName !== saved.displayName || name !== saved.fullName || showName !== saved.showName || aboutMe !== saved.aboutMe || division !== saved.division || preferredLanguage !== saved.preferredLanguage;
  useUnsavedChanges(dirty);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || !editing || loading || avatarLoading) return;
    setLoading(true); setMessage(""); setError("");
    try {
      const form = new FormData();
      form.set("displayName", displayName); form.set("name", name); form.set("showName", String(showName)); form.set("aboutMe", aboutMe);
      form.set("division", division); form.set("preferredLanguage", preferredLanguage);
      const response = await fetch("/api/profile", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save your profile.");
      setSaved(result); setDisplayName(result.displayName); setName(result.fullName); setShowName(result.showName); setAboutMe(result.aboutMe); setDivision(result.division); setPreferredLanguage(result.preferredLanguage);
      setEditing(false); setMessage("Profile saved."); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save your profile. Please try again."); }
    finally { setLoading(false); }
  }

  async function saveAvatar(picture: File | null) {
    setAvatarLoading(true); setMessage(""); setError("");
    try {
      const form = new FormData(); form.set("mode", "avatar");
      if (picture) form.set("avatar", picture); else form.set("removeAvatar", "true");
      const response = await fetch("/api/profile", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save your picture.");
      // A picture update must not save or discard unfinished text edits.
      setSaved(previous => ({ ...previous, avatarUrl: result.avatarUrl, hasAvatar: result.hasAvatar }));
      setMessage(picture ? "Picture saved." : "Picture removed."); router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your picture.";
      setError(message); throw new Error(message);
    } finally { setAvatarLoading(false); }
  }

  const inputClass = "h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary read-only:bg-muted/30 disabled:bg-muted/30 disabled:text-muted-foreground";
  return <Card className="overflow-hidden">
    <form onSubmit={save}>
      <fieldset disabled={loading} className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-3xl font-black text-primary">
            {saved.avatarUrl && !imageFailed ? <img src={saved.avatarUrl} alt={`${saved.displayName}'s profile picture`} className="h-full w-full object-cover" onError={() => setImageFailed(true)} /> : (saved.displayName.trim()[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1"><h1 className="break-words text-3xl font-black">{saved.displayName}</h1>{saved.showName && saved.fullName && <p className="mt-1 break-words text-muted-foreground">{saved.fullName}</p>}<p className="mt-1 break-all text-sm text-muted-foreground">{email}</p>
            <p className="mt-2 text-sm text-muted-foreground">{saved.division} · {PROGRAMMING_LANGUAGES[saved.preferredLanguage]}</p>
            {publicProfileUrl && <Link href={publicProfileUrl} className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">View public profile</Link>}
            <div className="mt-3 flex flex-wrap gap-2"><AvatarPicker disabled={loading || avatarLoading} hasAvatar={saved.hasAvatar} onApply={saveAvatar} />
              {saved.hasAvatar && <Button type="button" size="sm" variant="ghost" disabled={avatarLoading} onClick={() => { void saveAvatar(null).catch(() => {}); }}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>}
              {avatarLoading && <span role="status" className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving picture…</span>}
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-6"><h2 className="font-bold">Profile details</h2></div>
        <label className="block max-w-lg"><span className="mb-1.5 block text-sm font-semibold">Display name</span><input ref={nameInput} required readOnly={!editing} maxLength={60} autoComplete="nickname" value={displayName} onChange={event => { setDisplayName(event.target.value); setMessage(""); }} className={inputClass} /></label>
        <div className="max-w-lg space-y-3"><label className="block"><span className="mb-1.5 block text-sm font-semibold">Full name</span><input required readOnly={!editing} maxLength={60} autoComplete="name" value={name} onChange={event => { setName(event.target.value); setMessage(""); }} className={inputClass} /></label><label className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"><input type="checkbox" disabled={!editing} checked={showName} onChange={event => { setShowName(event.target.checked); setMessage(""); }} className="mt-1 accent-primary" /><span className="block text-sm font-semibold">Show my full name on my profile</span></label></div>
        <div className="grid max-w-lg gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-semibold">Division</span><select required aria-label="Division" disabled={!editing} value={division} onChange={event => { setDivision(event.target.value as Division); setMessage(""); }} className={inputClass}>{DIVISIONS.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold">Programming language</span><select required aria-label="Programming language" disabled={!editing} value={preferredLanguage} onChange={event => { setPreferredLanguage(event.target.value as Language); setMessage(""); }} className={inputClass}>{Object.entries(PROGRAMMING_LANGUAGES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div><label htmlFor="about-me" className="mb-1.5 block text-sm font-semibold">About me</label><textarea id="about-me" name="aboutMe" readOnly={!editing} rows={5} maxLength={MAX_ABOUT_ME_LENGTH} placeholder="Your interests, favorite programming languages, or what you’re working toward…" value={aboutMe} onChange={event => { setAboutMe(event.target.value); setMessage(""); }} aria-describedby="about-me-count" className="w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none read-only:bg-muted/30 focus:ring-2 focus:ring-primary" /><p id="about-me-count" className="mt-1 text-right text-xs text-muted-foreground">{aboutMe.length} / {MAX_ABOUT_ME_LENGTH}</p></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{dirty ? "You have unsaved changes." : ""}</p><div className="flex gap-2"><Button type="button" variant="outline" disabled={editing || loading || avatarLoading} onClick={() => { setEditing(true); setMessage(""); }}><Pencil className="h-4 w-4" />Edit profile</Button><Button type="submit" disabled={loading || avatarLoading || !dirty} className={!dirty ? "bg-muted text-muted-foreground hover:bg-muted disabled:opacity-100" : undefined}>{loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{loading ? "Saving…" : "Save profile"}</Button></div></div>
      </fieldset>
      {error && <p role="alert" className="mx-6 mb-6 rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger sm:mx-8">{error}</p>}
      {message && <p role="status" className="mx-6 mb-6 rounded-lg bg-success/10 p-3 text-sm text-success sm:mx-8">{message}</p>}
    </form>
  </Card>;
}
