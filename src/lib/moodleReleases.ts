/**
 * Moodle release support matrix.
 *
 * Source: https://moodledev.io/general/releases
 * Last updated: 2026-05-16. Update this file whenever Moodle ships a release
 * or moves an existing one between general/security/eol support windows.
 */

export type SupportLevel = "general" | "security" | "eol" | "future";

export interface MoodleRelease {
  version: string;
  stableTag: string;
  releaseDate: string;
  generalSupportEnds: string;
  securitySupportEnds: string;
  isLts: boolean;
}

const RELEASES: MoodleRelease[] = [
  {
    version: "5.3",
    stableTag: "MOODLE_503_STABLE",
    releaseDate: "2026-10-05",
    generalSupportEnds: "2027-10-04",
    securitySupportEnds: "2029-10-01",
    isLts: true,
  },
  {
    version: "5.2",
    stableTag: "MOODLE_502_STABLE",
    releaseDate: "2026-04-20",
    generalSupportEnds: "2027-04-19",
    securitySupportEnds: "2027-10-04",
    isLts: false,
  },
  {
    version: "5.1",
    stableTag: "MOODLE_501_STABLE",
    releaseDate: "2025-10-06",
    generalSupportEnds: "2026-10-05",
    securitySupportEnds: "2027-04-19",
    isLts: false,
  },
  {
    version: "5.0",
    stableTag: "MOODLE_500_STABLE",
    releaseDate: "2025-04-14",
    generalSupportEnds: "2026-04-20",
    securitySupportEnds: "2026-10-05",
    isLts: false,
  },
  {
    version: "4.5",
    stableTag: "MOODLE_405_STABLE",
    releaseDate: "2024-10-07",
    generalSupportEnds: "2025-10-06",
    securitySupportEnds: "2027-10-04",
    isLts: true,
  },
];

export function getReleases(): readonly MoodleRelease[] {
  return RELEASES;
}

export function supportLevelOn(release: MoodleRelease, today: Date): SupportLevel {
  const t = today.getTime();
  if (t < Date.parse(release.releaseDate)) return "future";
  if (t <= Date.parse(release.generalSupportEnds)) return "general";
  if (t <= Date.parse(release.securitySupportEnds)) return "security";
  return "eol";
}

export interface SupportSnapshot {
  generalSupport: MoodleRelease[];
  securityOnly: MoodleRelease[];
  future: MoodleRelease[];
  eol: MoodleRelease[];
}

export function snapshotSupport(today: Date = new Date()): SupportSnapshot {
  const snap: SupportSnapshot = {
    generalSupport: [],
    securityOnly: [],
    future: [],
    eol: [],
  };
  for (const r of RELEASES) {
    switch (supportLevelOn(r, today)) {
      case "general":
        snap.generalSupport.push(r);
        break;
      case "security":
        snap.securityOnly.push(r);
        break;
      case "future":
        snap.future.push(r);
        break;
      case "eol":
        snap.eol.push(r);
        break;
    }
  }
  return snap;
}
