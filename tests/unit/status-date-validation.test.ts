import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  ENTRY_STATUS_MAP,
  assertTransitionAllowed,
  getStatusBgClass,
  getStatusLabel,
} from "@/lib/status";
import { excelSerialToIsoDate, formatDateRangeStable, formatDateStable, normalizeDobToIso } from "@/lib/date";
import { isRegistrationClosed, toIsoDate } from "@/lib/events/registration";
import { OtpVerifySchema, ParentCreateStudentSchema, UpsertEntrySchema } from "@/lib/validation";
import { isOptimizableImageSrc, initialsOf } from "@/components/ui/safe-avatar";

const DB_STATUSES = ["draft", "pending_coach", "submitted", "approved", "rejected", "correction_needed", "coach_declined", "withdrawn"];

describe("lib/status", () => {
  it("has a label and token-based badge for every DB status", () => {
    for (const s of DB_STATUSES) {
      expect(ENTRY_STATUS_MAP).toHaveProperty(s);
      expect(getStatusLabel(s)).not.toBe(s);
      expect(getStatusBgClass(s)).toMatch(/var\(--status-/);
    }
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual([...DB_STATUSES].sort());
  });

  it("parent vs coach labels and the transition guard", () => {
    expect(getStatusLabel("pending_coach", "parent")).toBeTruthy();
    expect(getStatusLabel("pending_coach", "coach")).toBeTruthy();
    expect(getStatusLabel("unknown_status")).toBe("unknown_status");
    expect(() => assertTransitionAllowed("pending_coach", "submitted")).not.toThrow();
    expect(() => assertTransitionAllowed("withdrawn", "approved")).toThrow(/Invalid status transition/);
  });
});

describe("lib/date", () => {
  it("normalizes DOBs from common formats", () => {
    expect(normalizeDobToIso("2015-06-20")).toBe("2015-06-20");
    expect(normalizeDobToIso("20/06/2015")).toBe("2015-06-20");
    expect(normalizeDobToIso("5-1-2015")).toBe("2015-01-05");
    expect(normalizeDobToIso(42175)).toBe("2015-06-20");
    expect(normalizeDobToIso("42175")).toBe("2015-06-20");
    expect(normalizeDobToIso(new Date(Date.UTC(2015, 5, 20)))).toBe("2015-06-20");
    expect(normalizeDobToIso("31/13/2015")).toBeNull();
    expect(normalizeDobToIso("")).toBeNull();
    expect(excelSerialToIsoDate(0)).toBeNull();
  });

  it("formats dates without timezone drift", () => {
    expect(formatDateStable("2027-03-14")).toBe("14/03/2027");
    expect(formatDateStable(new Date(Date.UTC(2027, 2, 14)))).toBe("14/03/2027");
    expect(formatDateRangeStable("2027-03-14", "2027-03-14")).toBe("14/03/2027");
    expect(formatDateRangeStable("2027-03-14", "2027-03-15")).toBe("14/03/2027 – 15/03/2027");
  });
});

describe("lib/events/registration", () => {
  const today = "2027-03-01";
  it("toIsoDate", () => {
    expect(toIsoDate("2027-03-14T00:00:00Z")).toBe("2027-03-14");
    expect(toIsoDate(new Date(Date.UTC(2027, 2, 14)))).toBe("2027-03-14");
    expect(toIsoDate(null)).toBeNull();
  });
  it("closed when manually closed, past close date, or past event", () => {
    expect(isRegistrationClosed({ is_registration_open: true, end_date: "2027-03-15" }, today)).toBe(false);
    expect(isRegistrationClosed({ is_registration_open: false, end_date: "2027-03-15" }, today)).toBe(true);
    expect(isRegistrationClosed({ is_registration_open: true, registration_close_date: "2027-02-28", end_date: "2027-03-15" }, today)).toBe(true);
    expect(isRegistrationClosed({ is_registration_open: true, registration_close_date: "2027-03-01", end_date: "2027-03-15" }, today)).toBe(false);
    expect(isRegistrationClosed({ is_registration_open: true, end_date: "2027-02-28" }, today)).toBe(true);
  });
  it("a temporary burst window re-opens a closed event", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isRegistrationClosed({ is_registration_open: false, end_date: "2999-01-01", temporary_registration_closes_at: future })).toBe(false);
  });
});

describe("lib/validation", () => {
  const uuid = "3f2b8c1e-2d4a-4b6c-8e9f-0a1b2c3d4e5f";
  it("OtpVerifySchema", () => {
    expect(OtpVerifySchema.safeParse({ email: " A@B.com ", code: "123456" }).success).toBe(true);
    expect(OtpVerifySchema.safeParse({ email: "a@b.com", code: "12345" }).success).toBe(false);
    expect(OtpVerifySchema.safeParse({ email: "a@b.com", code: "12a456" }).success).toBe(false);
  });
  it("UpsertEntrySchema", () => {
    expect(UpsertEntrySchema.safeParse({ student_id: uuid, event_id: uuid, declared_weight_kg: 31.5 }).success).toBe(true);
    expect(UpsertEntrySchema.safeParse({ student_id: uuid, event_id: uuid, declared_weight_kg: 0 }).success).toBe(false);
    expect(UpsertEntrySchema.safeParse({ student_id: "nope", event_id: uuid }).success).toBe(false);
  });
  it("ParentCreateStudentSchema requires consent, photo, DOB, weight", () => {
    const ok = {
      dojo_id: uuid, name: "Asha", gender: "female", date_of_birth: "2015-06-20", rank: "green", weight: 31.5,
      school_or_city: "Pune", photo_url: "https://x.public.blob.vercel-storage.com/a.jpg", consent: true,
    };
    expect(ParentCreateStudentSchema.safeParse(ok).success).toBe(true);
    expect(ParentCreateStudentSchema.safeParse({ ...ok, consent: false }).success).toBe(false);
    expect(ParentCreateStudentSchema.safeParse({ ...ok, photo_url: "" }).success).toBe(false);
    expect(ParentCreateStudentSchema.safeParse({ ...ok, date_of_birth: "1900-01-01" }).success).toBe(false);
  });
});

describe("SafeAvatar helpers", () => {
  it("only hands next/image sources it can optimise", () => {
    expect(isOptimizableImageSrc("/icons/a.svg")).toBe(true);
    expect(isOptimizableImageSrc("https://abc.public.blob.vercel-storage.com/x.jpg")).toBe(true);
    expect(isOptimizableImageSrc("https://lh3.googleusercontent.com/a/x")).toBe(true);
    expect(isOptimizableImageSrc("https://evil.example.com/x.jpg")).toBe(false);
    expect(isOptimizableImageSrc("http://abc.public.blob.vercel-storage.com/x.jpg")).toBe(false);
    expect(isOptimizableImageSrc("data:image/png;base64,AAA")).toBe(false);
    expect(isOptimizableImageSrc("//cdn.example.com/x.jpg")).toBe(false);
    expect(isOptimizableImageSrc(null)).toBe(false);
  });
  it("initials", () => {
    expect(initialsOf("Sensei Kenji Tanaka")).toBe("ST");
    expect(initialsOf("asha")).toBe("A");
    expect(initialsOf("")).toBe("?");
  });
});
