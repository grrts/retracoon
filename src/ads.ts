// Monetisation hook. Policy (from the design doc): at most one ad, shown at launch before
// the menu, never during a run, never after death, never blocking a reward. No SDK is
// wired up yet; when one is, this is the only place that may show an ad.
export const ADS_ENABLED = false;

export async function startupAd(): Promise<void> {
  if (!ADS_ENABLED) return;
  // Integrate the ad SDK here and resolve once the ad closes or fails to load.
}
