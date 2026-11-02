export const SITE_ORIGIN = "https://acsl.netlify.app";

function isDeployHost(hostname: string) {
  return /^[a-z0-9-]+--acsl\.netlify\.app$/i.test(hostname);
}

function useSiteOrigin(url: URL) {
  const canonical = new URL(SITE_ORIGIN);
  url.protocol = canonical.protocol;
  url.host = canonical.host;
  url.port = canonical.port;
  url.username = "";
  url.password = "";
  return url;
}

export function canonicalSiteUrl(value: string): URL {
  const url = new URL(value);
  if (url.hostname === "acsl.netlify.app" || isDeployHost(url.hostname)) return useSiteOrigin(url);
  return url;
}

export function siteOrigin(value: string) {
  return canonicalSiteUrl(value).origin;
}

export function canonicalRedirectUrl(value: string, hostHeader: string | null) {
  const url = new URL(value);
  const hostname = hostHeader?.replace(/:\d+$/, "").toLowerCase();
  if (hostname === "acsl.netlify.app") return null;
  return isDeployHost(url.hostname) || (hostname && isDeployHost(hostname)) ? useSiteOrigin(url) : null;
}

export function requestSiteOrigin(value: string, hostHeader: string | null) {
  const hostname = hostHeader?.replace(/:\d+$/, "").toLowerCase();
  if (hostname === "acsl.netlify.app" || (hostname && isDeployHost(hostname))) return SITE_ORIGIN;
  return siteOrigin(value);
}
