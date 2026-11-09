import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  mapBelt,
  mapParticipation,
  mapSex,
  RINGFLOW_HEADERS,
  toRingFlowRows,
  type RingFlowSourceEntry,
} from "@/lib/export/ringflow";
import { normalizeSex, prepareOfficialRows, type RawImportAthlete } from "../fixtures/ringflow-official-import";

const RINGFLOW = process.env.RINGFLOW_DIR || "D:/symm/symmetrical-memory/RingFlow-CISCE";

function entry(over: Partial<RingFlowSourceEntry>): RingFlowSourceEntry {
  return {
    chest_no: 1,
    dojo_name: "Shotokan Pune",
    dojo_join_code: "a1b2c3",
    registration_no: "SK26-0001",
    name: "Asha Rao",
    gender: "female",
    dob: "2015-06-20",
    rank: "green",
    weight_kg: "31.5",
    day_name: "Day 1",
    participation_type: "both",
    category_label: "Under 12 · Girls · -35 kg",
    ...over,
  };
}

/** What RingFlow's AthletesClient does with each sheet row before calling importOfficialRoster. */
function ringflowClientMap(row: Record<string, unknown>): RawImportAthlete & { day: string } {
  const r = row as Record<string, any>;
  return {
    chestNumber: String(r.Number || r.number || r.no || r.No || r.chest_number || ""),
    school: String(r.School || r.school || r.dojo || r.Dojo || r.club || ""),
    schoolCode: String(r["School Code"] || r.school_code || r.SchoolCode || ""),
    sportsId: String(r["SPORTS ID"] || r.sports_id || r.SportsId || ""),
    name: String(r.Name || r.name || r.athlete || "Unknown"),
    age: String(r.age || r.Age || ""),
    sex: String(r.sex || r.Sex || r.gender || ""),
    belt: String(r.belt || r.Belt || ""),
    day: String(r.day || r.Day || ""),
    weight: r.weight ?? r.Weight ?? r["weight (kg)"] ?? r["Weight (kg)"] ?? r.wt ?? null,
    kata: r.kata ?? r.Kata ?? r.KATA ?? null,
    kumite: r.kumite ?? r.Kumite ?? r.KUMITE ?? null,
    teamKata: r.teamKata ?? r["Team Kata"] ?? r.team_kata ?? null,
    teamKumite: r.teamKumite ?? r["Team Kumite"] ?? r.team_kumite ?? null,
  };
}

/** Write rows to an .xlsx the way the export button does, then read the first sheet back like RingFlow. */
function roundTrip(rows: ReturnType<typeof toRingFlowRows>) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...RINGFLOW_HEADERS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Roster");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const back = XLSX.read(buf);
  const sheet = back.Sheets[back.SheetNames[0]];
  const headerRow = (XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][])[0];
  return { headerRow, json: XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[] };
}

describe("RingFlow mappings", () => {
  it("maps sex to what RingFlow's normalizeSex accepts", () => {
    expect(mapSex("male")).toBe("M");
    expect(mapSex("female")).toBe("F");
    expect(mapSex("other")).toBe("");
    expect(mapSex(null)).toBe("");
    expect(normalizeSex(mapSex("male"))).toBe("M");
    expect(normalizeSex(mapSex("female"))).toBe("F");
  });

  it("maps EntryDesk rank slugs to RingFlow belt names", () => {
    const cases: Record<string, string> = {
      white: "White", yellow: "Yellow", orange: "Orange", green: "Green", blue: "Blue", purple: "Purple",
      brown: "Brown", brown_3: "Brown", brown_2: "Brown", brown_1: "Brown",
      black: "Black", black_1: "Black", black_2: "Black", black_3: "Black", shodan: "Black", nidan: "Black", sandan: "Black",
      "": "",
    };
    for (const [slug, belt] of Object.entries(cases)) expect(mapBelt(slug)).toBe(belt);
    expect(mapBelt(null)).toBe("");
    expect(mapBelt("Green Belt")).toBe("Green");
  });

  it("derives event flags from participation_type", () => {
    expect(mapParticipation("both")).toEqual({ kata: true, kumite: true, teamKata: false, teamKumite: false });
    expect(mapParticipation("kata")).toEqual({ kata: true, kumite: false, teamKata: false, teamKumite: false });
    expect(mapParticipation("kumite,team_kata")).toEqual({ kata: false, kumite: true, teamKata: true, teamKumite: false });
    expect(mapParticipation("both, team_kata, team_kumite")).toEqual({ kata: true, kumite: true, teamKata: true, teamKumite: true });
    expect(mapParticipation(null)).toEqual({ kata: false, kumite: false, teamKata: false, teamKumite: false });
  });

  it("computes age on the event's reference date (tournament_day vs jan_1)", () => {
    const e = entry({ dob: "2015-06-20" });
    expect(toRingFlowRows([e], { start_date: "2027-06-19", age_cutoff_rule: "tournament_day" })[0].age).toBe(11);
    expect(toRingFlowRows([e], { start_date: "2027-06-20", age_cutoff_rule: "tournament_day" })[0].age).toBe(12);
    expect(toRingFlowRows([e], { start_date: "2027-06-20", age_cutoff_rule: "jan_1" })[0].age).toBe(11);
    expect(toRingFlowRows([entry({ dob: null })], { start_date: "2027-06-20", age_cutoff_rule: null })[0].age).toBe("");
  });

  it("orders by chest number and drops rows without one", () => {
    const rows = toRingFlowRows(
      [entry({ chest_no: 3, name: "C" }), entry({ chest_no: null, name: "X" }), entry({ chest_no: 1, name: "A" })],
      { start_date: "2027-03-14", age_cutoff_rule: "tournament_day" }
    );
    expect(rows.map((r) => r.Name)).toEqual(["A", "C"]);
  });
});

describe("RingFlow official-roster import accepts the export", () => {
  const event = { start_date: "2027-03-14", age_cutoff_rule: "tournament_day" };
  const ranks = ["white", "yellow", "orange", "green", "blue", "purple", "brown_3", "brown_1", "black_1", "black_3"];
  const types = ["both", "kata", "kumite", "kata,team_kata", "both,team_kumite", null];
  const source: RingFlowSourceEntry[] = Array.from({ length: 60 }, (_, i) => ({
    chest_no: i + 1,
    dojo_name: `Dojo ${i % 7}`,
    dojo_join_code: `c0de${i % 7}`,
    registration_no: `SK26-${String(i + 1).padStart(4, "0")}`,
    name: `Athlete ${i + 1}`,
    gender: i % 3 === 0 ? "male" : i % 3 === 1 ? "female" : "other",
    dob: `${2008 + (i % 12)}-0${1 + (i % 9)}-1${i % 9}`,
    rank: ranks[i % ranks.length],
    weight_kg: i % 11 === 0 ? null : String(20 + (i % 50) + 0.25),
    day_name: i % 2 ? "Day 1" : "Day 2",
    participation_type: types[i % types.length],
    category_label: null,
  }));

  it("uses exactly RingFlow's headers on the first sheet", () => {
    const { headerRow } = roundTrip(toRingFlowRows(source, event));
    expect(headerRow).toEqual([...RINGFLOW_HEADERS]);
  });

  it("every row passes prepareOfficialRows with nothing skipped and counts matching", () => {
    const exported = toRingFlowRows(source, event);
    const { json } = roundTrip(exported);
    const mapped = json.map(ringflowClientMap).filter((a) => a.name !== "Unknown");
    expect(mapped).toHaveLength(source.length);

    const { rows, skipped } = prepareOfficialRows(mapped);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(source.length);

    // Chest numbers, sex, belt, weight and event flags survive the trip.
    for (let i = 0; i < rows.length; i++) {
      const src = source[i];
      const row = rows[i];
      expect(row.chestNumber).toBe(String(src.chest_no));
      expect(row.sportsId).toBe(src.registration_no);
      expect(row.sex).toBe(src.gender === "male" ? "M" : src.gender === "female" ? "F" : null);
      expect(row.sexUnrecognised).toBe(false);
      expect(row.belt).toBe(mapBelt(src.rank) || null);
      expect(row.weight).toBe(src.weight_kg == null ? null : Number(src.weight_kg));
      const flags = mapParticipation(src.participation_type);
      if (src.participation_type) {
        expect(row.kata).toBe(flags.kata);
        expect(row.kumite).toBe(flags.kumite);
      }
      expect(row.teamKata).toBe(flags.teamKata);
      expect(row.teamKumite).toBe(flags.teamKumite);
    }
    const kumiteCount = rows.filter((r) => r.kumite).length;
    const expectedKumite = source.filter((s) =>
      s.participation_type ? mapParticipation(s.participation_type).kumite : s.weight_kg != null
    ).length;
    expect(kumiteCount).toBe(expectedKumite);
  });

  it.skipIf(!fs.existsSync(path.join(RINGFLOW, "src/lib/roster/officialImport.ts")))(
    "the copied RingFlow fixture still matches RingFlow's source",
    () => {
      const fixture = fs.readFileSync(path.resolve(import.meta.dirname, "../fixtures/ringflow-official-import.ts"), "utf8");
      const ringflow = fs.readFileSync(path.join(RINGFLOW, "src/lib/roster/officialImport.ts"), "utf8");
      const start = ringflow.indexOf("export function prepareOfficialRows");
      const end = ringflow.indexOf("\n}\n", start) + 3;
      expect(start).toBeGreaterThan(-1);
      expect(fixture).toContain(ringflow.slice(start, end));
      const rules = fs.readFileSync(path.join(RINGFLOW, "src/lib/local/rules.ts"), "utf8");
      const s2 = rules.indexOf("export function normalizeSex");
      expect(fixture).toContain(rules.slice(s2, rules.indexOf("\n}\n", s2) + 3));
    }
  );
});
