# Gen Flights

This page draws a boarding pass. The pass is calculated by a separate private API, not in this public repository.

Set `window.GEN_FLIGHTS_API_BASE` in `api-config.js` to that API's origin (`https://…`, no path) after the API exists. Leave it empty until then. An empty value shows the unconfigured state and does not generate a pass in the browser.

The page keeps a short-lived bearer token in `sessionStorage` for this tab only. A reload of the same tab keeps it. Other tabs do not. Logout deletes that copy. A token that was copied elsewhere keeps working until it expires, because the API does not store a revocation list.

Sign-in uses a redirect to the API and then back to this exact page. The return URL has to be allowlisted on the API. GitHub tokens are not handled here.

The previous in-browser generator remains in the public git history of this site. Deleting it from the current file does not make that history secret.

The site menu still does not link to this page.
