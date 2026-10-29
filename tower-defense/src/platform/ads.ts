/** Integration port only. No ad SDK, simulated ad, or ad UI is shipped.
 * An Android build can inject an implementation after consent and SDK setup.
 * Gameplay never depends on this interface being present. */
export interface AdProvider { showInterstitial(placement: 'between-levels'): Promise<void>; showRewarded(placement: 'optional-recovery'): Promise<boolean> }
