import type { StreamEvent } from "../../lib/schema";
import type { PipelineStep } from "../../lib/schema";
import { POST } from "../../app/api/audit/route";
import { test, assert } from "./assert";

const PIPELINE_STEPS: PipelineStep[] = [
  "resolve",
  "fetch",
  "audit",
  "generate",
  "deploy",
];

async function readSseEvents(response: Response): Promise<StreamEvent[]> {
  if (response.body === null) {
    throw new Error("response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: StreamEvent[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const dataLine = chunk
        .split("\n")
        .find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      events.push(JSON.parse(dataLine.slice(6)) as StreamEvent);
    }
  }

  if (buffer.trim()) {
    const dataLine = buffer
      .split("\n")
      .find((line) => line.startsWith("data: "));
    if (dataLine) {
      events.push(JSON.parse(dataLine.slice(6)) as StreamEvent);
    }
  }

  return events;
}

function firstStepStartIndex(
  events: StreamEvent[],
  step: PipelineStep,
): number | undefined {
  const idx = events.findIndex(
    (e) => e.type === "step" && e.step === step && e.status === "start",
  );
  return idx === -1 ? undefined : idx;
}

test("POST demoSlug versailles: SSE contract and pipeline order", async () => {
  const req = new Request("http://localhost/api/audit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ demoSlug: "versailles" }),
  });

  const response = await POST(req);
  assert.equal(response.status, 200, "status 200");

  const events = await readSseEvents(response);

  const hasResolveStart = events.some(
    (e) => e.type === "step" && e.step === "resolve" && e.status === "start",
  );
  const hasResolveDone = events.some(
    (e) => e.type === "step" && e.step === "resolve" && e.status === "done",
  );
  assert.ok(hasResolveStart, "resolve start");
  assert.ok(hasResolveDone, "resolve done");

  const snapshot = events.find((e) => e.type === "snapshot");
  if (snapshot?.type !== "snapshot") {
    throw new Error("missing snapshot event");
  }
  assert.ok(snapshot.data.businessName.length > 0, "snapshot businessName");

  const auditEv = events.find((e) => e.type === "audit");
  if (auditEv?.type !== "audit") {
    throw new Error("missing audit event");
  }
  assert.inRange(auditEv.data.overallScore, 0, 100, "audit overallScore");

  const deployEv = events.find((e) => e.type === "deploy");
  if (deployEv?.type !== "deploy") {
    throw new Error("missing deploy event");
  }
  assert.ok(deployEv.data.url.length > 0, "deploy url non-empty");

  const hasDone = events.some((e) => e.type === "done");
  const hasError = events.some((e) => e.type === "error");
  assert.ok(hasDone, "terminal done event");
  assert.ok(!hasError, "no error event in stream");

  let lastIndex = -1;
  for (const step of PIPELINE_STEPS) {
    const idx = firstStepStartIndex(events, step);
    if (idx !== undefined) {
      assert.ok(idx > lastIndex, `step ${step} order`);
      lastIndex = idx;
    }
  }
});

test("POST empty body returns 400", async () => {
  const req = new Request("http://localhost/api/audit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  const response = await POST(req);
  assert.equal(response.status, 400, "empty body 400");
});
