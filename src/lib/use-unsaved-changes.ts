"use client";

import { useEffect, useRef } from "react";

export function useUnsavedChanges(dirty: boolean) {
  const allowNavigation = useRef(false);
  useEffect(() => {
    allowNavigation.current = false;
    if (!dirty) return;
    const message = "You have unsaved changes. Leave without saving?";
    const currentUrl = window.location.href;
    const currentState = window.history.state;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (allowNavigation.current) return;
      event.preventDefault(); event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const target = new URL(anchor.href, currentUrl), current = new URL(currentUrl);
      // The native unload dialog handles external navigation. Hash links stay on this page.
      if (target.origin !== current.origin || (target.pathname === current.pathname && target.search === current.search)) return;
      if (window.confirm(message)) allowNavigation.current = true;
      else { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const pop = (event: PopStateEvent) => {
      if (allowNavigation.current) return;
      if (window.confirm(message)) allowNavigation.current = true;
      else {
        // Stop the router before it changes the page, then restore this entry's URL/state.
        event.stopImmediatePropagation();
        window.history.pushState(currentState, "", currentUrl);
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", pop, true);
    };
  }, [dirty]);
}
