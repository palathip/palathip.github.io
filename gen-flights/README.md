# Gen Flights

This page draws a boarding pass. The pass is calculated by a separate private API, not in this public repository.

`window.GEN_FLIGHTS_API_BASE` in `api-config.js` is the API origin `https://boombibu-api-palathips-projects.vercel.app` with no path. Vercel Authentication on that host can still block the browser. This page does not bypass that protection.

The page keeps a short-lived bearer token in `sessionStorage` for this tab only. A reload of the same tab keeps it. Other tabs do not. Logout deletes that copy. A token that was copied elsewhere keeps working until it expires, because the API does not store a revocation list.

Sign-in redirects to the API and back to exactly `https://palathip.github.io/gen-flights/` or `https://palathip.github.io/gen-flights/index.html`. A missing slash on `/gen-flights` is canonicalized to the first of those. Other paths are not sent. A rejected boarding-pass field stays on the retry state and does not log the tab out. GitHub tokens are not handled here.

The previous in-browser generator remains in the public git history of this site. Deleting it from the current file does not make that history secret.

The site menu still does not link to this page.
