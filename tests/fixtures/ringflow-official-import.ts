// AUTO-COPIED FIXTURE — do not edit by hand.
// Verbatim copy of RingFlow's official-roster row checks (RingFlow is a separate app and is
// not modified from here):
//   RingFlow-CISCE/src/lib/roster/officialImport.ts  (types, parse helpers, prepareOfficialRows)
//   RingFlow-CISCE/src/lib/local/rules.ts            (normalizeSex)
// tests/unit/ringflow-export.test.ts checks this copy still matches RingFlow when the repo is present.
/* eslint-disable */
export function normalizeSex(value: unknown): "M" | "F" | null {
  const s = String(value ?? "").trim().toLowerCase();
  if (["m", "male", "boy", "boys", "b"].includes(s)) return "M";
  if (["f", "female", "girl", "girls", "g"].includes(s)) return "F";
  return null;
}

export type RawImportAthlete = {
  name: string;
  chestNumber?: string | null;
  school?: string | null;
  schoolCode?: string | null;
  sportsId?: string | null;
  belt?: string | null;
  age?: number | string | null;
  sex?: string | null;
  weight?: number | string | null;
  kata?: boolean | string | number | null;
  kumite?: boolean | string | number | null;
  teamKata?: boolean | string | number | null;
  teamKumite?: boolean | string | number | null;
};

export type ImportResult = {
  success: boolean;
  totalAthletes: number;
  kataEntriesCreated: number;
  kumiteEntriesCreated: number;
  teamKataEntriesCreated: number;
  teamKumiteEntriesCreated: number;
  uncategorized: Array<{
    name: string;
    reason: string;
  }>;
  /** Rows not written at all (unreadable cells, a repeated Number, an unclear match to an existing athlete). */
  skipped: Array<{
    name: string;
    reason: string;
  }>;
};

function normalizeBoolean(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "yes" || s === "y" || s === "true" || s === "1";
  }
  return false;
}

export function parseFlag(val: unknown): boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string" && val.trim() === "") return null;
  return normalizeBoolean(val);
}

export function parseSex(val: unknown): "M" | "F" | null {
  return normalizeSex(String(val ?? "").replace(/[^a-z]/gi, ""));
}

export function parseSheetNumber(val: unknown): number | null | "invalid" {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : "invalid";
  let s = String(val).trim().toLowerCase();
  if (s === "" || s === "-" || s === "na" || s === "n/a") return null;
  s = s.replace(/\s*(kgs?|yrs?|years?)?\.?$/, "");
  if (/^\d+,\d{3}$/.test(s) || (s.includes(",") && s.includes("."))) return "invalid";
  s = s.replace(/^(\d+),(\d+)$/, "$1.$2");
  if (!/^\d+(\.\d+)?$/.test(s)) return "invalid";
  return parseFloat(s);
}

const normKey = (val: unknown) => String(val ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export interface PreparedOfficialRow {
  name: string;
  chestNumber: string | null;
  school: string | null;
  schoolCode: string | null;
  sportsId: string | null;
  belt: string | null;
  age: number | null;
  sex: "M" | "F" | null;
  /** The sex cell had text that is not a sex. */
  sexUnrecognised: boolean;
  weight: number | null;
  kata: boolean;
  kumite: boolean;
  teamKata: boolean;
  teamKumite: boolean;
}

export function prepareOfficialRows(rawAthletes: readonly RawImportAthlete[]) {
  const rows: PreparedOfficialRow[] = [];
  const skipped: ImportResult["skipped"] = [];
  const seenChest = new Set<string>();
  const seenNatural = new Set<string>();
  const text = (val: unknown, max: number) => {
    const s = val == null ? "" : String(val).trim().slice(0, max);
    return s === "" ? null : s;
  };

  for (const item of rawAthletes) {
    const name = (item.name || "").trim().slice(0, 200);
    if (!name) continue;
    const problems: string[] = [];

    const age = parseSheetNumber(item.age);
    if (age === "invalid" || (age !== null && (age < 0 || age >= 120))) problems.push(`age "${item.age}" is not a valid age`);

    let weight = parseSheetNumber(item.weight);
    if (typeof weight === "number") weight = Math.round(weight * 100) / 100;
    if (weight === "invalid" || (weight !== null && (weight < 0 || weight >= 1000))) problems.push(`weight "${item.weight}" is not a valid weight`);

    const chestNumber = text(item.chestNumber, 50);
    const school = text(item.school, 200);
    const sportsId = text(item.sportsId, 50);
    if (chestNumber) {
      if (seenChest.has(chestNumber)) problems.push(`Number ${chestNumber} is already used by an earlier row`);
      seenChest.add(chestNumber);
    } else {
      const natural = `${normKey(name)}|${normKey(school)}|${normKey(sportsId)}`;
      if (seenNatural.has(natural)) problems.push("same name, school and sports ID as an earlier row");
      seenNatural.add(natural);
    }

    if (problems.length > 0) {
      skipped.push({ name, reason: problems.join("; ") });
      continue;
    }

    const kataFlag = parseFlag(item.kata);
    const kumiteFlag = parseFlag(item.kumite);
    const w = weight as number | null;
    // A blank Kumite cell with a weight means kumite unless Kata is Yes; a blank Kata
    // cell means kata when no kumite was entered. An explicit "No" is always kept.
    const kumite = kumiteFlag === true || (kumiteFlag === null && kataFlag !== true && w != null && w > 0);
    const kata = kataFlag === true || (kataFlag === null && !kumite);
    const sex = parseSex(item.sex);

    rows.push({
      name,
      chestNumber,
      school,
      schoolCode: text(item.schoolCode, 50),
      sportsId,
      belt: text(item.belt, 50),
      age: age as number | null,
      sex,
      sexUnrecognised: sex === null && text(item.sex, 20) !== null,
      weight: w,
      kata,
      kumite,
      teamKata: normalizeBoolean(item.teamKata),
      teamKumite: normalizeBoolean(item.teamKumite),
    });
  }
  return { rows, skipped };
}
