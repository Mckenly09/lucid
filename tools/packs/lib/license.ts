// "No license, no pack" (docs/packs.md §1): the license is read from the source and must match sources.json.

/** CC license titles as they appear on the first line of a LICENSE file, and in collection metadata. */
const CC_TITLES: [RegExp, string][] = [
  [/Attribution-NonCommercial-ShareAlike 4\.0/i, 'CC BY-NC-SA 4.0'],
  [/Attribution-NonCommercial 4\.0/i, 'CC BY-NC 4.0'],
  [/Attribution-ShareAlike 4\.0/i, 'CC BY-SA 4.0'],
  [/Attribution 4\.0/i, 'CC BY 4.0'],
];

const CC_URLS: [RegExp, string][] = [
  [/licenses\/by-nc-sa\/4\.0/i, 'CC BY-NC-SA 4.0'],
  [/licenses\/by-nc\/4\.0/i, 'CC BY-NC 4.0'],
  [/licenses\/by-sa\/4\.0/i, 'CC BY-SA 4.0'],
  [/licenses\/by\/4\.0/i, 'CC BY 4.0'],
];

/** The license named by a LICENSE file's text, or null if it isn't one we recognize. */
export function licenseFromText(text: string): string | null {
  const head = text.slice(0, 300);
  return CC_TITLES.find(([re]) => re.test(head))?.[1] ?? null;
}

/** The license named by a license URL (OpenStax collection `md:license url`). */
export function licenseFromUrl(url: string): string | null {
  return CC_URLS.find(([re]) => re.test(url))?.[1] ?? null;
}

/**
 * Throws unless the license read from the source matches sources.json and may ship under APP_COMMERCIAL.
 * Eval-only sources (SciQ, GSM8K) never ship in a pack.
 */
export function checkLicense(opts: { found: (string | null)[]; declared: string; commercial: boolean; evalOnly: boolean }) {
  const { found, declared, commercial, evalOnly } = opts;
  if (evalOnly) throw new Error(`Source is eval-only (${declared}); it can never ship in a pack.`);
  for (const f of found) {
    if (!f) throw new Error(`Could not read a known license from the source; sources.json says ${declared}. Stopping.`);
    if (f !== declared) throw new Error(`License mismatch: the source says ${f}, sources.json says ${declared}. Stopping.`);
  }
  if (!CC_TITLES.some(([, id]) => id === declared)) throw new Error(`License ${declared} is not allowed in packs.`);
  if (commercial && declared.includes('NC')) {
    throw new Error(`${declared} is NonCommercial, but APP_COMMERCIAL=true in config.json. Stopping.`);
  }
}
