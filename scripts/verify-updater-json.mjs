import { readFile } from "node:fs/promises";

const source = process.argv[2];
if (!source) {
  throw new Error("usage: pnpm updater:verify <latest.json path, URL, or ->");
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const text =
  source === "-"
    ? await readStdin()
    : source.startsWith("https://")
      ? await fetch(source).then((response) => {
          if (!response.ok) {
            throw new Error(`updater metadata request failed with ${response.status}`);
          }
          return response.text();
        })
      : await readFile(source, "utf8");
const metadata = JSON.parse(text);

if (typeof metadata.version !== "string" || metadata.version.length === 0) {
  throw new Error("latest.json has no version");
}

for (const platform of ["darwin-aarch64", "windows-x86_64"]) {
  const entry = metadata.platforms?.[platform];
  if (!entry || typeof entry.url !== "string" || !entry.url.startsWith("https://")) {
    throw new Error(`latest.json has no HTTPS URL for ${platform}`);
  }
  if (typeof entry.signature !== "string" || entry.signature.length === 0) {
    throw new Error(`latest.json has no signature for ${platform}`);
  }
}

console.log(`Updater metadata ${metadata.version} covers macOS ARM64 and Windows x64.`);
