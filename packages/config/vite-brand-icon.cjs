const fs = require("node:fs");
const path = require("node:path");

const ICON_PATH = path.resolve(__dirname, "../ui/public/icon.svg");

// Serves the shared brand icon at /icon.svg during dev and writes it to the build output, so
// every app uses the one file in packages/ui/public instead of keeping its own copy.
module.exports = function brandIcon() {
  return {
    name: "nearcommerce-brand-icon",
    configureServer(server) {
      server.middlewares.use("/icon.svg", (_req, res) => {
        res.setHeader("Content-Type", "image/svg+xml");
        res.end(fs.readFileSync(ICON_PATH));
      });
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "icon.svg",
        source: fs.readFileSync(ICON_PATH),
      });
    },
  };
};
