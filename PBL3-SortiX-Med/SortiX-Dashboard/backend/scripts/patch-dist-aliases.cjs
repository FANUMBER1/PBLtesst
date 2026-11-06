const fs = require("node:fs");
const path = require("node:path");

const distRoot = path.resolve(__dirname, "..", "dist", "backend", "src");
const sharedRoot = path.resolve(__dirname, "..", "dist", "shared");
function patchDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) patchDirectory(target);
    else if (entry.isFile() && entry.name.endsWith(".js")) {
      const source = fs.readFileSync(target, "utf8");
      const sharedRelative = `${path.relative(path.dirname(target), sharedRoot).replaceAll(path.sep, "/")}/`;
      const patched = source.replaceAll('require("@shared/', `require("${sharedRelative}`);
      if (patched !== source) fs.writeFileSync(target, patched);
    }
  }
}
patchDirectory(distRoot);
