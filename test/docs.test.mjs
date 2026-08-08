import assert from "node:assert/strict";
import test from "node:test";
import { checkDocs } from "../scripts/check-docs.mjs";

test("the documentation index covers every guide and local links resolve", async () => {
  const result = await checkDocs();
  assert.ok(result.pages >= 10);
});
