import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = "/shiye-workbench/";
const directory = process.argv[2] || "dist";
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const html = await readFile(path.join(directory, "index.html"), "utf8");
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
  (match) => match[1],
);
for (const reference of references) {
  if (!reference.startsWith(base))
    throw Error(`Unexpected public resource path: ${reference}`);
  await readFile(path.join(directory, reference.slice(base.length)));
}

// Publish only the application build and bundled public examples.
async function inspect(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) {
      if (relative !== "assets")
        throw Error(`Unexpected build directory: ${relative}`);
      files.push(
        ...(await inspect(path.join(directory, entry.name), relative + "/")),
      );
    } else {
      if (
        !["index.html", "favicon.svg", "release.json"].includes(relative) &&
        !/^assets\/[^/]+\.(?:js|css|jpg|svg)$/.test(relative)
      )
        throw Error(`Unexpected public file: ${relative}`);
      files.push(relative);
    }
  }
  return files;
}
const files = await inspect(directory);
await writeFile(
  path.join(directory, "release.json"),
  JSON.stringify({ revision, base, resources: references }, null, 2) + "\n",
);
console.log(
  `Pages artifact verified: ${files.length + (files.includes("release.json") ? 0 : 1)} files, revision ${revision}`,
);
