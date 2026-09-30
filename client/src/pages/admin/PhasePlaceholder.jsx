import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Construction } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";

/**
 * A module that a later phase will build.
 *
 * It is permission-gated exactly like a finished module — an admin without the
 * permission sees "not permitted", not "coming soon" — so the access model does
 * not change as the phases land. What it does NOT do is fake content: there is
 * no placeholder table, no seeded rows and no disabled button pretending to
 * work. It states plainly that the module is not built yet, which is the one
 * thing a placeholder is actually good for.
 */
export default function PhasePlaceholder({ module, phase, permission }) {
  const { can } = useAdmin();

  if (!can(permission)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-black text-slate-700">Not permitted</p>
        <p className="text-[12px] text-slate-500">
          Your role does not include <code className="font-mono">{permission}</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <Construction className="h-8 w-8 text-slate-300" aria-hidden="true" />
      <h1 className="text-base font-black text-slate-800 dark:text-slate-100">{module}</h1>
      <p className="max-w-md text-[13px] leading-relaxed text-slate-500">
        This module is not built yet. It is scheduled for{" "}
        <span className="font-bold text-slate-700 dark:text-slate-200">{phase}</span> and
        its permission is already wired through the router and the API, so it will
        appear here automatically once the endpoint lands.
      </p>
      <Link
        to="/admin"
        className="rounded-xl bg-slate-900 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-white hover:bg-slate-800"
      >
        Back to dashboard
      </Link>
    </div>
  );
}