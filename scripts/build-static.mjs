// Static export for GitHub Pages: the API route can't be exported, so it is
// set aside for this build only (it lives on Netlify in production).
import { renameSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
const api = "src/app/api", tmp = ".api-tmp";
if (existsSync(api)) renameSync(api, tmp);
try {
  execSync("STATIC_EXPORT=1 npx next build", { stdio: "inherit" });
} finally {
  if (existsSync(tmp)) renameSync(tmp, api);
}
