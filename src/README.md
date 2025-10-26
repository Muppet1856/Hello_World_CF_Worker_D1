# Worker Source

This directory currently contains example code for the demo Worker. Swap in your own application files or remove the placeholders altogether so that deployments reflect your intended functionality.

## Default Worker Description

Serves an HTML greeting from D1 when the binding exists and falls back to a configurable message when it does not. The page clearly labels whether the data came from the database and surfaces any warnings.

## Worker behavior in depth
The Worker extracts request metadata to describe where the greeting was served from, escapes all HTML to avoid injection, and gracefully falls back when the database is unavailable. Errors return a styled HTML diagnostic page rather than a bare JSON payload so incidents are easier to spot when browsing directly.
