# Archived Site Technical Notes

This note preserves the retired data-processing description that previously appeared on the public technical details page.

## Retired Data Workflow Summary

The previous site documentation described a local workflow based on:

- Go CLI tools for data management
- SQLite for events, tracks, and class data
- CSV import for bulk updates
- JSON export for frontend consumption

That workflow is no longer part of the active architecture. The active site now consumes committed JSON data and uses Python-based AWS deployment tooling.
