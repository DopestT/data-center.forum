import { observeSource } from "./intelligence-content.mjs";
import { buildPerceptionEvent } from "./perception-bridge.mjs";

export async function runPerceptionSourceWatch({
  registry,
  snapshots,
  fetchContent,
  sendEvent,
  detectedAt = new Date().toISOString(),
  observeSourceImpl = observeSource,
}) {
  if (!Array.isArray(registry)) throw new Error("registry must be an array");
  if (!snapshots || typeof snapshots !== "object") throw new Error("snapshots must be an object");
  if (typeof fetchContent !== "function") throw new Error("fetchContent must be a function");
  if (typeof sendEvent !== "function") throw new Error("sendEvent must be a function");

  let observedCount = 0;
  let baselineCount = 0;
  let changeCount = 0;
  let deliveredCount = 0;
  const failures = [];

  for (const source of registry) {
    try {
      const content = await fetchContent(source);
      const result = observeSourceImpl(source, content, snapshots[source.id], detectedAt);
      observedCount += 1;
      if (result.baseline) baselineCount += 1;
      if (!result.change) continue;

      changeCount += 1;
      try {
        await sendEvent(buildPerceptionEvent(result.change));
        deliveredCount += 1;
      } catch (error) {
        failures.push({
          source_id: source.id,
          stage: "deliver",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      failures.push({
        source_id: source.id,
        stage: "fetch_or_observe",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    checked: registry.length,
    observedCount,
    baselineCount,
    changeCount,
    deliveredCount,
    failures,
  };
}
