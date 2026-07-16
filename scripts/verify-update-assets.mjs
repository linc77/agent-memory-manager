import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parse } from "yaml";

function value(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
}

const directory = resolve(value("--dir"));
const platform = value("--platform");
const version = value("--version").replace(/^v/, "");
if (!new Set(["mac", "win"]).has(platform)) throw new Error("--platform must be mac or win");

const metadataName = platform === "mac" ? "latest-mac.yml" : "latest.yml";
const metadataPath = join(directory, metadataName);
if (!existsSync(metadataPath)) throw new Error(`Missing ${metadataName}`);

const metadata = parse(readFileSync(metadataPath, "utf8"));
if (metadata.version !== version) {
  throw new Error(`${metadataName} version ${metadata.version ?? "<missing>"} does not match ${version}`);
}
if (!Array.isArray(metadata.files) || metadata.files.length === 0) {
  throw new Error(`${metadataName} has no update files`);
}

const expectedExtension = platform === "mac" ? ".zip" : ".exe";
const updateFiles = metadata.files.filter((file) => file.url?.endsWith(expectedExtension));
if (updateFiles.length !== 1) {
  throw new Error(`${metadataName} must reference exactly one ${expectedExtension} update payload`);
}
for (const file of updateFiles) {
  if (!file.sha512) throw new Error(`${metadataName} update payload is missing sha512`);
  const asset = join(directory, basename(file.url));
  if (!existsSync(asset)) throw new Error(`${metadataName} references missing asset ${basename(file.url)}`);
  if (!existsSync(`${asset}.blockmap`)) {
    throw new Error(`Missing blockmap for ${basename(file.url)}`);
  }
}

console.log(`update assets verified: ${platform} ${version}`);
