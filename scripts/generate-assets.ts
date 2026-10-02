import fs from "node:fs";
import { renderSamplePlan } from "./lib/plan-image";

fs.mkdirSync("public/demo", { recursive: true });
fs.writeFileSync("public/demo/planta-exemplo.png", renderSamplePlan());
console.log("✔ public/demo/planta-exemplo.png");
