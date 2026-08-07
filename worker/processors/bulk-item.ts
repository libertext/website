// The worker reuses the same bulk-item logic as the inline fallback so behavior
// is identical whichever path runs (§50). Import via relative path (no @/ alias in worker).
export { processBulkItem } from "../../src/lib/services/bulk-inline";
