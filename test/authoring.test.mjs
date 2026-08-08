import assert from "node:assert/strict";
import test from "node:test";
import { validateAuthoringExample } from "../scripts/validate-authoring-example.mjs";

test("the Copier authoring example rejects unsafe features and unknown inputs", async () => {
  assert.deepEqual(await validateAuthoringExample(), { templates: 1, samples: 1 });
});
