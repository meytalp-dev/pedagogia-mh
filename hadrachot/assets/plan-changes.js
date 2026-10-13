/* שינויי מועד שהמדריכות עשו בעצמן — נבנה אוטומטית מהשרת של מנור (plan.changes)
   ב-.github/workflows/sync-plan-changes.yml. לא עורכים ידנית: השינוי נעשה בלשונית
   "תוכנית שנתית" בדף המדריכה. ההסבר המלא: TS_applyPlanChanges ב-plans.js.
   נטען מיד אחרי plans.js. */
window.TS_PLAN_CHANGES = [
  {"g":"rozin","m":"2026-10-15","f":"2026-10-15","fs":"18:00","t":"2026-10-26","ts":"18:00"},
  {"g":"rozin","m":"2026-10-15","f":"2026-10-18","fs":"10:15","t":"2026-10-25","ts":"10:15"}
];
if (window.TS_applyPlanChanges) window.TS_applyPlanChanges(window.TS_PLAN_CHANGES);
