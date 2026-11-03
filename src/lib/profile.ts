export const PROFILE_PICTURE_BUCKET = "profile-pictures";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_ABOUT_ME_LENGTH = 1000;
export const DISPLAY_NAME_TAKEN_MESSAGE = "This display name is already taken. Choose another.";

export type EditableProfile = {
  displayName: string;
  fullName: string;
  showName: boolean;
  aboutMe: string;
  avatarUrl: string | null;
  hasAvatar: boolean;
};

export function validateDisplayName(displayName: unknown) {
  if (typeof displayName !== "string" || !displayName.trim() || displayName.trim().length > 60) throw new Error("Display name must be between 1 and 60 characters.");
  return displayName.trim();
}

export function validateProfileText(displayName: unknown, fullName: unknown, showName: unknown, about: unknown) {
  const normalizedDisplayName = validateDisplayName(displayName);
  if (typeof fullName !== "string" || !fullName.trim() || fullName.trim().length > 60) throw new Error("Full name must be between 1 and 60 characters.");
  if (typeof showName !== "boolean") throw new Error("Choose whether to show your name on your profile.");
  if (typeof about !== "string" || about.length > MAX_ABOUT_ME_LENGTH) throw new Error(`About me must be at most ${MAX_ABOUT_ME_LENGTH} characters.`);
  return { displayName: normalizedDisplayName, fullName: fullName.trim(), showName, aboutMe: about.trim() };
}

export function isOwnAvatarPath(path: unknown, userId: string): path is string {
  return typeof path === "string" && path.split("/").length === 2 && path.split("/")[0] === userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(path.split("/")[1]);
}

export async function validateAvatar(file: File): Promise<"jpg" | "png" | "webp"> {
  if (!file.size || file.size > MAX_AVATAR_BYTES) throw new Error("Choose a profile picture up to 2 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const startsWith = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  if (file.type === "image/jpeg" && startsWith([0xff, 0xd8, 0xff])) return "jpg";
  if (file.type === "image/png" && startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (file.type === "image/webp" && startsWith([0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  throw new Error("Choose a valid JPG, PNG, or WebP image.");
}
