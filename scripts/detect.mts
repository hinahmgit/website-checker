// Usage: npm run detect -- example.com another.com
import { analyzeUrl } from "../src/lib/detect/analyze";
import { normalizeInput } from "../src/lib/detect/fetch";

for (const arg of process.argv.slice(2)) {
  const started = Date.now();
  try {
    const r = await analyzeUrl(normalizeInput(arg));
    console.log(`\n■ ${r.domain}  (${Date.now() - started} ms)`);
    console.log(`  Platform : ${r.platform.name} [${r.platform.confidence}]  — ${r.platform.evidence.slice(0, 2).join("; ")}`);
    console.log(`  Theme    : ${r.theme ? `${r.theme.name}${r.theme.detail ? ` (${r.theme.detail})` : ""}` : "—"}`);
    console.log(`  Plan     : ${r.likelyPlan ? `${r.likelyPlan.label} [${r.likelyPlan.confidence}] — ${r.likelyPlan.reason}` : "—"}`);
    console.log(`  Apps     : ${r.appsCount}   Tech: ${r.technologies.map((t) => t.name).join(", ")}`);
    console.log(`  Issues   : ${r.issues.map((i) => `[${i.severity}] ${i.title}`).join(" | ")}`);
  } catch (e: any) {
    console.log(`\n■ ${arg}: ERROR ${e.userMessage ?? e.message}`);
  }
}
