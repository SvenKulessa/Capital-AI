import fs from "node:fs";

const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const files = Array.isArray(input.files) ? input.files.map(String) : [];
const hit = pattern => files.some(file => pattern(file));

const impact = {
  dependency: hit(f => f === "package.json" || f === "package-lock.json"),
  container: hit(f => f === "Dockerfile" || f === ".dockerignore" || f.startsWith("deploy/")),
  workflow: hit(f => f.startsWith(".github/workflows/")),
  contract: hit(f => f === "AGENTS.md" || f.startsWith("shared/") || f.startsWith("docs/security/")),
  product: hit(f => f.startsWith("src/"))
};

const required = Object.values(impact).some(Boolean);
const result = {
  schema: "POST_MERGE_CORRELATION@1",
  required,
  mainSha: input.mainSha,
  mergedPr: input.mergedPr,
  impact,
  policy: {
    autoFix: "bounded-only-after-3-positive-validations",
    destructiveFixes: false,
    deploy: false,
    natsHeadOnlyRedeploy: false,
    preserveNewerSecurityEvidence: true
  }
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
