import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

let bridge = null;
try {
  bridge = await import("./perception-bridge.mjs");
} catch {
  bridge = null;
}

let sourceWatch = null;
try {
  sourceWatch = await import("./perception-source-watch.mjs");
} catch {
  sourceWatch = null;
}

let cronRoute = null;
try {
  cronRoute = await import("../app/api/perception-source-watch/route.js");
} catch {
  cronRoute = null;
}

test("Perception bridge sender module exists", () => {
  assert.ok(bridge, "scripts/perception-bridge.mjs must exist");
});

test("buildPerceptionEvent maps a source change to the bridge contract", () => {
  assert.equal(typeof bridge?.buildPerceptionEvent, "function");
  const event = bridge.buildPerceptionEvent({
    source_id: "aws-whats-new",
    publisher: "AWS",
    url: "https://aws.amazon.com/example",
    project_slugs: ["example-project"],
    previous_hash: "oldhash",
    current_hash: "newhash",
    detected_at: "2026-10-04T21:00:00.000Z",
  });

  assert.equal(event.event_id, "source-change:aws-whats-new:newhash");
  assert.equal(event.event_type, "evidence.observed");
  assert.equal(event.subject_ref, "official-source:aws-whats-new");
  assert.equal(event.observed_at, "2026-10-04T21:00:00.000Z");
  assert.equal(event.data.canonicalUrl, "https://aws.amazon.com/example");
  assert.equal(event.data.current_hash, "newhash");
  assert.equal(event.data.verification_status, "needs_verification");
});

test("signPerceptionBody produces the documented sha256 HMAC", () => {
  assert.equal(typeof bridge?.signPerceptionBody, "function");
  const secret = "a".repeat(32);
  const timestamp = "1791147600";
  const body = JSON.stringify({ event_id: "evt-1" });
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  assert.equal(bridge.signPerceptionBody(secret, timestamp, body), `sha256=${expected}`);
});

test("sendPerceptionEvent signs the exact JSON body and uses bridge headers", async () => {
  assert.equal(typeof bridge?.sendPerceptionEvent, "function");
  const secret = "b".repeat(32);
  const event = { event_id: "evt-2", event_type: "evidence.observed" };
  let captured = null;

  const result = await bridge.sendPerceptionEvent(event, {
    url: "https://perception.example/bridge",
    secret,
    now: () => 1791147600000,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return {
        ok: true,
        status: 200,
        async json() {
          return { ok: true, observation_id: "obs-1" };
        },
      };
    },
  });

  const body = JSON.stringify(event);
  assert.equal(captured.url, "https://perception.example/bridge");
  assert.equal(captured.options.method, "POST");
  assert.equal(captured.options.body, body);
  assert.equal(captured.options.headers["content-type"], "application/json");
  assert.equal(captured.options.headers["x-perception-client"], "datacenter-forums");
  assert.equal(captured.options.headers["x-perception-timestamp"], "1791147600");
  assert.equal(
    captured.options.headers["x-perception-signature"],
    bridge.signPerceptionBody(secret, "1791147600", body),
  );
  assert.deepEqual(result, { ok: true, observation_id: "obs-1" });
});

test("sendPerceptionEvent rejects non-success bridge responses", async () => {
  assert.equal(typeof bridge?.sendPerceptionEvent, "function");
  await assert.rejects(
    bridge.sendPerceptionEvent({ event_id: "evt-3" }, {
      url: "https://perception.example/bridge",
      secret: "c".repeat(32),
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        async text() {
          return '{"error":"Unauthorized"}';
        },
      }),
    }),
    /Perception bridge HTTP 401/,
  );
});

test("Perception scheduled source-watch module exists", () => {
  assert.ok(sourceWatch, "scripts/perception-source-watch.mjs must exist");
});

test("runPerceptionSourceWatch sends only detected changes", async () => {
  assert.equal(typeof sourceWatch?.runPerceptionSourceWatch, "function");

  const registry = [
    { id: "changed", publisher: "AWS", url: "https://example.com/changed" },
    { id: "steady", publisher: "Google", url: "https://example.com/steady" },
  ];
  const snapshots = {
    changed: { hash: "old" },
    steady: { hash: "same" },
  };
  const delivered = [];

  const result = await sourceWatch.runPerceptionSourceWatch({
    registry,
    snapshots,
    detectedAt: "2026-10-04T21:20:00.000Z",
    fetchContent: async (source) => `content:${source.id}`,
    observeSourceImpl: (source, _content, snapshot, detectedAt) => {
      if (source.id === "changed") {
        return {
          snapshot: { hash: "new" },
          baseline: false,
          change: {
            source_id: source.id,
            publisher: source.publisher,
            url: source.url,
            project_slugs: ["alpha"],
            previous_hash: snapshot.hash,
            current_hash: "new",
            detected_at: detectedAt,
          },
        };
      }
      return { snapshot, baseline: false, change: null };
    },
    sendEvent: async (event) => {
      delivered.push(event);
      return { ok: true, observation_id: "obs-123" };
    },
  });

  assert.equal(result.checked, 2);
  assert.equal(result.observedCount, 2);
  assert.equal(result.changeCount, 1);
  assert.equal(result.deliveredCount, 1);
  assert.equal(result.failures.length, 0);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].event_id, "source-change:changed:new");
});

test("Perception production cron route exists and validates CRON_SECRET", () => {
  assert.ok(cronRoute, "app/api/perception-source-watch/route.js must exist");
  assert.equal(typeof cronRoute?.isAuthorizedCron, "function");
  assert.equal(cronRoute.isAuthorizedCron("Bearer cron-secret", "cron-secret"), true);
  assert.equal(cronRoute.isAuthorizedCron("Bearer wrong", "cron-secret"), false);
  assert.equal(cronRoute.isAuthorizedCron(null, "cron-secret"), false);
  assert.equal(cronRoute.isAuthorizedCron("Bearer cron-secret", ""), false);
});
