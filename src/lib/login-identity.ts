export function loginEmail(value: string) {
  return value.trim().toLowerCase() === "admin"
    ? process.env.NEXT_PUBLIC_ADMIN_EMAIL || "chrisgaorb@gmail.com"
    : value.trim();
}
