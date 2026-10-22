import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.test"), override: true });
// Optional, git-ignored per-machine overrides (e.g. a different local MySQL password).
dotenv.config({ path: path.resolve(__dirname, "../.env.test.local"), override: true });

process.env.NODE_ENV = "test";
