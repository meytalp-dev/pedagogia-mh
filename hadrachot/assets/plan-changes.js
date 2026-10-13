/* שינויי מועד שהמדריכות עשו בעצמן — נבנה אוטומטית מהשרת של מנור (plan.changes)
   ב-.github/workflows/sync-plan-changes.yml. לא עורכים ידנית: השינוי נעשה בלשונית
   "תוכנית שנתית" בדף המדריכה. ההסבר המלא: TS_applyPlanChanges ב-plans.js.
   נטען מיד אחרי plans.js. */
window.TS_PLAN_CHANGES = [];
if (window.TS_applyPlanChanges) window.TS_applyPlanChanges(window.TS_PLAN_CHANGES);
