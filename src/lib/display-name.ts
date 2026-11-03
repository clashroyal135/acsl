export async function isDisplayNameAvailable(name: string): Promise<boolean> {
  const response = await fetch(`/api/auth/display-name?name=${encodeURIComponent(name.trim())}`, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to check this display name. Please try again.");
  return result.available === true;
}
