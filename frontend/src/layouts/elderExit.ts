import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

/** What ElderLayout hands its pages through the Outlet context. */
export interface ElderOutletContext {
  setExitTo(to: string | null): void;
}

/** Lets an elder-friendly page point the header's Exit link somewhere (for example the session's elder page). */
export function useElderExit(to: string | null | undefined) {
  const ctx = useOutletContext<ElderOutletContext | undefined>();
  const setExitTo = ctx?.setExitTo;
  useEffect(() => {
    if (!setExitTo || !to) return;
    setExitTo(to);
    return () => setExitTo(null);
  }, [setExitTo, to]);
}
