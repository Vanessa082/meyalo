/** Connections too slow for even a small decorative video. 3G is fine: the
 *  welcome clip is about 110 KB (BRAND.md). */
const SLOW = ['slow-2g', '2g'];

export interface PlaybackConditions {
  reduceMotion: boolean;
  /** The browser's data-saving request (Network Information API). */
  saveData?: boolean;
  /** 'slow-2g' | '2g' | '3g' | '4g', when the browser reports it. */
  effectiveType?: string;
}

/** A background video plays only when motion is welcome and data is not
 *  scarce. Unknown connection details count as fine. */
export function decorativeVideoAllowed(
  conditions: PlaybackConditions,
): boolean {
  if (conditions.reduceMotion || conditions.saveData) return false;
  return !(conditions.effectiveType && SLOW.includes(conditions.effectiveType));
}
