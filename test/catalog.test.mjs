import assert from "node:assert/strict";
import test from "node:test";
import { validateCatalog } from "../scripts/validate-catalog.mjs";

test("the official catalog and every referenced artifact are valid", async () => {
  assert.deepEqual(await validateCatalog(), { templates: 2, targets: 4 });
});
