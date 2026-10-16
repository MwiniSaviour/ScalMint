/* Verifies the S5 polyline morph with framer-motion's own analyser/mixer.
   Reads the real `vertices` arrays out of S5Roi.tsx so it cannot drift. */
const fs = require("fs");
const path = require("path");

const fm = require(
  path.resolve("node_modules/framer-motion/dist/cjs/index.js")
);

const SRC = fs.readFileSync(
  "src/components/sections/S5Roi.tsx",
  "utf8"
);

const formatPoints = (vs) => vs.map(([x, y]) => `${x},${y}`).join(" ");

// Pull every `vertices: [...]` block out of the source, in order.
const blocks = [...SRC.matchAll(/vertices:\s*\[([\s\S]*?)\],\s*\n\s*notch/g)].map(
  (m) =>
    [...m[1].matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)].map(
      ([, x, y]) => [Number(x), Number(y)]
    )
);

const ids = [...SRC.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);

console.log(`slides parsed: ${blocks.length}  ids: ${ids.join(", ")}`);

const pts = blocks.map(formatPoints);

let ok = true;

console.log("\n--- Motion.analyseComplexValue (real framer-motion v" +
  require(path.resolve("node_modules/framer-motion/package.json")).version + ") ---");
pts.forEach((p, i) => {
  const a = fm.analyseComplexValue(p);
  console.log(
    `  ${ids[i].padEnd(9)} numeric tokens = ${String(a.values.length).padStart(2)}   ` +
      `types = ${new Set(a.types).size === 1 ? [...new Set(a.types)].join(",") : [...new Set(a.types)].join(",")}   ` +
      `separator template = ${JSON.stringify(a.split.join("\u0001"))}`
  );
});

const tokenCounts = new Set(pts.map((p) => fm.analyseComplexValue(p).values.length));
const splitTemplates = new Set(
  pts.map((p) => fm.analyseComplexValue(p).split.join("\u0001"))
);
console.log(`\n  distinct token counts across slides : ${[...tokenCounts].join(",")}`);
console.log(`  distinct separator templates        : ${splitTemplates.size}`);

if (tokenCounts.size !== 1) {
  console.log("  FAIL - token counts differ, Motion would degrade to a swap");
  ok = false;
}
if (splitTemplates.size !== 1) {
  console.log("  FAIL - separator shapes differ");
  ok = false;
}

console.log("\n--- Motion.mixComplex mid-transition samples (p = 0.5) ---");
const r = (v) => Math.round(v * 1000) / 1000;
for (let i = 0; i < pts.length; i++) {
  const j = (i + 1) % pts.length;
  const blend = fm.mixComplex(pts[i], pts[j]);
  const mid = blend(0.5);
  const from = fm.analyseComplexValue(pts[i]).values;
  const to = fm.analyseComplexValue(pts[j]).values;
  const nums = fm.analyseComplexValue(mid).values;

  // every vertex must sit strictly between the two endpoints, except coords
  // that happen to be identical on both slides
  const strictlyBetween = nums.every((v, k) => {
    if (from[k] === to[k]) return v === from[k];
    return v > Math.min(from[k], to[k]) && v < Math.max(from[k], to[k]);
  });
  const interior = nums.filter((v, k) => from[k] !== to[k]).length;

  console.log(
    `  ${ids[i]} -> ${ids[j]}: tokens=${nums.length} changed=${interior} ` +
      `mid[0..3]=${nums.slice(0, 4).map(r).join(",")} ` +
      `from[0..3]=${from.slice(0, 4).join(",")} to[0..3]=${to.slice(0, 4).join(",")}  ` +
      (strictlyBetween ? "OK (true morph)" : "FAIL")
  );
  if (!strictlyBetween) ok = false;
}

console.log(`\n${ok ? "PASS" : "FAIL"}: points morph interpolates on every slide pair`);
process.exit(ok ? 0 : 1);