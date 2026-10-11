// Lint is deliberately narrow: it exists to catch the bugs a browser only
// finds at runtime — a name that was never defined or imported (a
// ReferenceError the first time that code path runs), duplicate object keys,
// redeclarations. Style is not enforced here.
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "tests/**", "scripts/**"],
  },
  {
    files: ["app.js", "utils.js", "features/**/*.js", "src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.browser,
        // Libraries injected on demand (see the loaders in app.js).
        html2canvas: "readonly",
        emailjs: "readonly",
        // Live-session state: session-state.js owns it and app.js bridges the
        // names onto globalThis with Object.defineProperty, so bare reads and
        // writes are intentional.
        _sessionMatchHistory: "writable",
        _sessionRedoStack: "writable",
        _sessionPendingCount: "writable",
        _sessionPanelOpen: "writable",
        _sessionSetupSelected: "writable",
      },
    },
    rules: {
      "no-undef": "error",
      "no-dupe-keys": "error",
      "no-redeclare": "error",
      "no-const-assign": "error",
      "no-dupe-args": "error",
      "no-unreachable": "error",
    },
  },
  {
    files: ["sw.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "script",
      globals: { ...globals.serviceworker },
    },
    rules: { "no-undef": "error", "no-dupe-keys": "error" },
  },
];
