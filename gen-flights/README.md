# Gen Flights

This page draws a boarding pass. The pass is calculated by a separate private API, not in this public repository.

`window.GEN_FLIGHTS_API_BASE` in `api-config.js` is the API origin `https://boombibu-api.vercel.app` with no path. This page does not change API protection or send tokens in the URL.

The page keeps a short-lived bearer token in `sessionStorage` for this tab only. A reload of the same tab keeps it. Other tabs do not. Logout deletes that copy. A token that was copied elsewhere keeps working until it expires, because the API does not store a revocation list.

Sign-in redirects to the API and back to exactly `https://palathip.github.io/gen-flights/` or `https://palathip.github.io/gen-flights/index.html`. A missing slash on `/gen-flights` is canonicalized to the first of those. Other paths are not sent. A rejected boarding-pass field stays on the retry state and does not log the tab out. GitHub tokens are not handled here.

The previous in-browser generator remains in the public git history of this site. Deleting it from the current file does not make that history secret.

The top menu links here again. Until GitHub sign-in succeeds, the generator stays on screen dimmed and blurred behind a sign-in card, and the form cannot be used. After sign-in, a compact account chip shows the GitHub login and avatar when the session response includes them.
