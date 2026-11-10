import { describe, expect, it } from "vitest";
import {
  daysLeftText,
  daysUntil,
  formatCloseDateBadge,
  formatDobLong,
  formatTournamentDateRangeLong,
  weekdayName,
} from "@/lib/date";
import { ENTRY_STATUS_MAP, getStatusLabel } from "@/lib/status";

// Owner decisions 09/11/2026: every date is DD/MM/YYYY; one status word per stage for every role.

describe("DD/MM/YYYY everywhere", () => {
  it("formats single dates and ranges", () => {
    expect(formatDobLong("2014-05-12")).toBe("12/05/2014");
    expect(formatCloseDateBadge("2027-01-05")).toBe("05/01/2027");
    expect(formatTournamentDateRangeLong("2027-01-10", "2027-01-11")).toBe("10/01/2027 – 11/01/2027");
    expect(formatTournamentDateRangeLong("2027-01-10", "2027-01-10")).toBe("10/01/2027");
  });

  it("counts days left and names the weekday", () => {
    const today = new Date(Date.UTC(2026, 10, 9)); // 09/11/2026
    expect(daysUntil("2027-01-05", today)).toBe(57);
    expect(daysLeftText("2027-01-05", today)).toBe("57 days left");
    expect(daysLeftText("2026-11-10", today)).toBe("1 day left");
    expect(daysLeftText("2026-11-09", today)).toBe("Last day today");
    expect(daysLeftText("2026-11-01", today)).toBe("Closed");
    expect(weekdayName("2027-01-10")).toBe("Sunday");
  });
});

describe("one word per stage", () => {
  it("parent and coach see the same word", () => {
    for (const s of Object.keys(ENTRY_STATUS_MAP)) {
      expect(getStatusLabel(s, "coach")).toBe(getStatusLabel(s, "parent"));
    }
  });

  it("uses the agreed words", () => {
    expect(getStatusLabel("pending_coach")).toBe("With coach");
    expect(getStatusLabel("submitted")).toBe("With organiser");
    expect(getStatusLabel("approved")).toBe("Accepted");
    expect(getStatusLabel("correction_needed")).toBe("Needs a fix");
    expect(getStatusLabel("rejected")).toBe("Not accepted");
    expect(getStatusLabel("coach_declined")).toBe("Not accepted");
  });
});
