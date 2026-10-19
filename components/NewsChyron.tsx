import Link from "next/link";
import { getChyronEvents, type IntelligenceEvent } from "../lib/intelligence-events";

const EMPTY_COPY = "DATA CENTER INTELLIGENCE · SOURCE-LINKED PROJECT DATA";

function labelFor(event: IntelligenceEvent) {
  const type = event.eventType.toLowerCase();
  if (["power", "transmission", "generation"].some((value) => type.includes(value))) return "POWER WATCH";
  if (type.includes("permit")) return "PERMIT WATCH";
  if (type.includes("land")) return "LAND WATCH";
  return "DATA CENTER NEWS";
}

function displayDate(event: IntelligenceEvent) {
  const value = event.occurredAt ?? event.publishedAt ?? event.verifiedAt;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function EventItems({ events, duplicate = false }: { events: IntelligenceEvent[]; duplicate?: boolean }) {
  return (
    <div className="newsChyronGroup" aria-hidden={duplicate || undefined}>
      {events.map((event) => (
        <Link
          className="newsChyronItem"
          href={event.projectSlug ? `/database/${event.projectSlug}` : "/changes"}
          key={`${duplicate ? "copy:" : ""}${event.id}`}
          tabIndex={duplicate ? -1 : undefined}
        >
          <span className="newsChyronType">{labelFor(event)}</span>
          <span className="newsChyronVerified">VERIFIED</span>
          <strong>{event.headline}</strong>
          {(event.region ?? event.market) && <span>{event.region ?? event.market}</span>}
          <time dateTime={event.occurredAt ?? event.verifiedAt}>{displayDate(event)}</time>
        </Link>
      ))}
    </div>
  );
}

export async function NewsChyron() {
  const events = await getChyronEvents(20);
  if (!events.length) {
    return (
      <div className="newsChyron newsChyronEmpty" role="region" aria-label="Data center intelligence status">
        <span>{EMPTY_COPY}</span>
      </div>
    );
  }

  return (
    <div className="newsChyron" role="region" aria-label="Verified data center news">
      <div className="newsChyronLead" aria-hidden="true">LIVE INTELLIGENCE</div>
      <div className="newsChyronViewport">
        <div className="newsChyronTrack">
          <EventItems events={events} />
          <EventItems events={events} duplicate />
        </div>
      </div>
    </div>
  );
}
