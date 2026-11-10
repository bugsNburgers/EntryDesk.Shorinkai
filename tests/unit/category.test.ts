import { describe, expect, it } from "vitest";
import { ageOn, ageReferenceDate, calculateCategory } from "@/lib/category";
import { categoryForEvent, snapshotColumns } from "@/lib/entries/snapshot";

describe("ageReferenceDate", () => {
  it("tournament_day uses the start date, jan_1 uses 1 January of the start year", () => {
    expect(ageReferenceDate("2027-03-14", "tournament_day")).toBe("2027-03-14");
    expect(ageReferenceDate("2027-03-14", "jan_1")).toBe("2027-01-01");
    expect(ageReferenceDate(new Date(Date.UTC(2027, 2, 14)), "jan_1")).toBe("2027-01-01");
    expect(ageReferenceDate("2027-03-14", null)).toBe("2027-03-14");
    expect(ageReferenceDate(null, "jan_1")).toBeNull();
  });
});

describe("ageOn", () => {
  it("counts whole years and handles the birthday boundary", () => {
    expect(ageOn("2015-06-20", "2027-06-19")).toBe(11);
    expect(ageOn("2015-06-20", "2027-06-20")).toBe(12);
    expect(ageOn("2015-06-20", "2027-06-21")).toBe(12);
    expect(ageOn("2016-02-29", "2027-02-28")).toBe(10);
    expect(ageOn("2016-02-29", "2027-03-01")).toBe(11);
    expect(ageOn("not a date", "2027-01-01")).toBeNull();
  });
});

describe("calculateCategory", () => {
  const ref = (referenceDate: string) => ({ referenceDate });

  it("age group boundaries (age on the reference date)", () => {
    const at = (dob: string, on: string) => calculateCategory({ date_of_birth: dob, gender: "male", rank: null, weight: null }, ref(on)).ageGroup;
    expect(at("2019-03-14", "2027-03-14")).toBe("Mini (Under 8)"); // 8
    expect(at("2018-03-14", "2027-03-14")).toBe("Under 10"); // 9
    expect(at("2017-03-15", "2027-03-14")).toBe("Under 10"); // 9 (birthday tomorrow)
    expect(at("2017-03-14", "2027-03-14")).toBe("Under 10"); // 10
    expect(at("2016-03-14", "2027-03-14")).toBe("Under 12"); // 11
    expect(at("2014-03-14", "2027-03-14")).toBe("Under 14"); // 13
    expect(at("2010-03-14", "2027-03-14")).toBe("Under 18 (Junior)"); // 17
    expect(at("2005-03-14", "2027-03-14")).toBe("Senior (21+)"); // 22
  });

  it("the two cutoff rules can put the same athlete in different groups", () => {
    const athlete = { name: "A", date_of_birth: "2015-06-01", gender: "female", rank: "green", weight: 30 };
    const tournamentDay = categoryForEvent(athlete, { start_date: "2026-11-20", age_cutoff_rule: "tournament_day" });
    const jan1 = categoryForEvent(athlete, { start_date: "2026-11-20", age_cutoff_rule: "jan_1" });
    expect(tournamentDay.ageYears).toBe(11);
    expect(jan1.ageYears).toBe(10);
    expect(tournamentDay.ageGroup).toBe("Under 12");
    expect(jan1.ageGroup).toBe("Under 10");
  });

  it("weight class boundaries", () => {
    const w = (weight: number | string, gender = "male", dob = "2015-01-01") =>
      calculateCategory({ date_of_birth: dob, gender, rank: null, weight }, ref("2027-03-14")).weightClass;
    expect(w(25)).toBe("-25 kg");
    expect(w(25.01)).toBe("-30 kg");
    expect(w(50)).toBe("-50 kg");
    expect(w(50.5)).toBe("+50 kg");
    expect(w(45.5, "female")).toBe("+45 kg");
    expect(w("31.5")).toBe("-35 kg"); // NUMERIC columns arrive as strings
    expect(w(84, "male", "2000-01-01")).toBe("-84 kg");
    expect(w(84.1, "male", "2000-01-01")).toBe("+84 kg");
    expect(w(68.5, "female", "2000-01-01")).toBe("+68 kg");
  });

  it("labels and fallbacks", () => {
    expect(calculateCategory({ date_of_birth: null, gender: "male", rank: null, weight: null }).displayName).toBe("Boys");
    expect(calculateCategory({ date_of_birth: null, gender: "other", rank: null, weight: null }).genderLabel).toBe("Open");
    const full = calculateCategory({ date_of_birth: "2015-06-20", gender: "female", rank: "green", weight: 31.5 }, ref("2027-03-14"));
    expect(full.displayName).toBe("Under 12 · Girls · -35 kg");
    expect(calculateCategory({ date_of_birth: "2030-01-01", gender: "male", rank: null, weight: 30 }, ref("2027-01-01")).ageYears).toBeNull();
  });
});

describe("snapshotColumns", () => {
  it("uses the declared weight when given and computes the category from it", () => {
    const cols = snapshotColumns(
      { name: "Asha", gender: "female", date_of_birth: "2015-06-20", rank: "green", weight: "31.5", school_or_city: "Pune" },
      { start_date: "2027-03-14", age_cutoff_rule: "tournament_day" },
      36
    );
    expect(cols).toMatchObject({ snap_name: "Asha", snap_dob: "2015-06-20", declared_weight_kg: 36, snap_school_or_city: "Pune" });
    expect(cols.category_snapshot.weightClass).toBe("-40 kg");
  });
});
