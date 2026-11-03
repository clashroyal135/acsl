"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarPicker } from "@/components/avatar-picker";
import { MAX_ABOUT_ME_LENGTH, type EditableProfile } from "@/lib/profile";

export function ProfileEditor({ initialProfile, email, publicProfileUrl }: { initialProfile: EditableProfile; email: string; publicProfileUrl?: string }) {
  const [saved, setSaved] = useState(initialProfile);
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [name, setName] = useState(initialProfile.fullName);
  const [showName, setShowName] = useState(initialProfile.showName);
  const [aboutMe, setAboutMe] = useState(initialProfile.aboutMe);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const avatarUrl = removeAvatar ? null : file ? preview : saved.avatarUrl;
  useEffect(() => { setImageFailed(false); }, [avatarUrl]);
  const dirty = displayName !== saved.displayName || name !== saved.fullName || showName !== saved.showName || aboutMe !== saved.aboutMe || Boolean(file) || removeAvatar;

  async function save(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage(""); setError("");
    try {
      const form = new FormData();
      form.set("displayName", displayName); form.set("name", name); form.set("showName", String(showName)); form.set("aboutMe", aboutMe); form.set("removeAvatar", String(removeAvatar));
      if (file) form.set("avatar", file);
      const response = await fetch("/api/profile", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save your profile.");
      setSaved(result); setDisplayName(result.displayName); setName(result.fullName); setShowName(result.showName); setAboutMe(result.aboutMe);
      setFile(null); setRemoveAvatar(false);
      setMessage("Profile saved."); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save your profile. Please try again."); }
    finally { setLoading(false); }
  }

  return <Card className="overflow-hidden">
    <form onSubmit={save}>
      <fieldset disabled={loading} className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-3xl font-black text-primary">
            {avatarUrl && !imageFailed ? <img src={avatarUrl} alt={`${saved.displayName}'s profile picture`} className="h-full w-full object-cover" onError={() => setImageFailed(true)} /> : (displayName.trim()[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1"><h1 className="break-words text-3xl font-black">{saved.displayName}</h1>{saved.showName && saved.fullName && <p className="mt-1 break-words text-muted-foreground">{saved.fullName}</p>}<p className="mt-1 break-all text-sm text-muted-foreground">{email}</p>{publicProfileUrl && <Link href={publicProfileUrl} className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">View public profile</Link>}
            <div className="mt-3 flex flex-wrap gap-2"><AvatarPicker disabled={loading} hasAvatar={Boolean(saved.hasAvatar || file)} onApply={(picture) => { setFile(picture); setRemoveAvatar(false); setError(""); setMessage(""); }} />
              {(file || saved.hasAvatar) && !removeAvatar && <Button type="button" size="sm" variant="ghost" onClick={() => { setFile(null); setRemoveAvatar(true); setError(""); setMessage(""); }}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>}
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-6"><h2 className="font-bold">Edit profile</h2><p className="mt-1 text-sm text-muted-foreground">Add a picture and tell us a little about yourself.</p></div>
        <label className="block max-w-lg"><span className="mb-1.5 block text-sm font-semibold">Display name</span><input required maxLength={60} autoComplete="nickname" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setMessage(""); }} className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary" /></label>
        <div className="max-w-lg space-y-3"><label className="block"><span className="mb-1.5 block text-sm font-semibold">Full name</span><input required maxLength={60} autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setMessage(""); }} className="h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary" /></label><label className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"><input type="checkbox" checked={showName} onChange={(event) => { setShowName(event.target.checked); setMessage(""); }} className="mt-1 accent-primary" /><span><span className="block text-sm font-semibold">Show my full name on my profile</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Your full name appears only on your profile when enabled.</span></span></label></div>
        <div><label htmlFor="about-me" className="mb-1.5 block text-sm font-semibold">About me</label><textarea id="about-me" name="aboutMe" rows={5} maxLength={MAX_ABOUT_ME_LENGTH} placeholder="Your interests, favorite programming languages, or what you’re working toward…" value={aboutMe} onChange={(event) => { setAboutMe(event.target.value); setMessage(""); }} aria-describedby="about-me-count" className="w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-primary" /><p id="about-me-count" className="mt-1 text-right text-xs text-muted-foreground">{aboutMe.length} / {MAX_ABOUT_ME_LENGTH}</p></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{dirty ? "You have unsaved changes." : "Use Save profile to keep your changes."}</p><Button type="submit" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} {loading ? "Saving…" : "Save profile"}</Button></div>
      </fieldset>
      {error && <p role="alert" className="mx-6 mb-6 rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger sm:mx-8">{error}</p>}
      {message && <p role="status" className="mx-6 mb-6 rounded-lg bg-success/10 p-3 text-sm text-success sm:mx-8">{message}</p>}
    </form>
  </Card>;
}
