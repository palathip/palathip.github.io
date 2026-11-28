# Gen Flights

This page draws a boarding pass. The pass is calculated by a separate private API, not in this public repository.

`window.GEN_FLIGHTS_API_BASE` in `api-config.js` is the API origin `https://boombibu-api.vercel.app` with no path. This page does not change API protection or send tokens in the URL.

The page keeps a short-lived bearer token in `sessionStorage` for this tab only. A reload of the same tab keeps it. Other tabs do not. Logout deletes that copy. A token that was copied elsewhere keeps working until it expires, because the API does not store a revocation list.

Sign-in redirects to the API and back to exactly `https://palathip.github.io/gen-flights/` or `https://palathip.github.io/gen-flights/index.html`. A missing slash on `/gen-flights` is canonicalized to the first of those. Other paths are not sent. A rejected boarding-pass field stays on the retry state and does not log the tab out. GitHub tokens are not handled here.

The previous in-browser generator remains in the public git history of this site. Deleting it from the current file does not make that history secret.

The top menu links here again. Until GitHub sign-in succeeds, a decorative placeholder stays dimmed behind the sign-in card. The real ticket form lives in a template and is not in the document until the session is confirmed. Logout and an expired session remove it again. After sign-in, a compact account chip shows the GitHub login and avatar when the session response includes them.

Inside the /v2 window (`?embed=v2` in a frame) the page uses the light window theme, and sign-in runs in a popup, because GitHub will not render its sign-in page inside a frame. The popup goes straight to the API (it never loads this page on the way out) and comes back through the same allowlisted `return_to`. A small inline script at the top of `<head>` sees a returning `gf_code` in a top-level tab that holds no verifier, relays only that code to the window (BroadcastChannel, plus `postMessage` to the opener when GitHub's opener policy leaves it), and closes the popup before the site nav or styles render. A normal top-level sign-in always keeps its verifier in its own tab, so it is never mistaken for the popup. The PKCE verifier and the bearer token stay in the framed page, and PKCE binds the code to that verifier. If the popup is blocked, the card says so and the title bar's open-in-new-tab button still works. If a browser keeps the popup open, it shows only "Sign-in finished. You can close this window."
