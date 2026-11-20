// lib/supabase/service.ts imports "server-only", which only exists inside a
// Next.js build. Outside Next (this script, under tsx) resolve it to nothing.
const Module = require("module");
const original = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "server-only") return require.resolve("./server-only-stub.cjs");
  return original.call(this, request, ...rest);
};
