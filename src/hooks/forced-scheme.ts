import { createContext } from 'react';

/** Set by ForceDark (components/ui/force-dark) for a subtree that must use
 *  one palette whatever the system setting, e.g. text over video. */
export const ForcedSchemeContext = createContext<'dark' | null>(null);
