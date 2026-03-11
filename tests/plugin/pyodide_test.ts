/**
 * Phase 9b: Pyodide Python Sandbox tests.
 * Uses a mock Pyodide loader since real WASM binaries are not available in tests.
 */
import { assertEquals, assertRejects } from "@std/assert";
import { createPythonSandbox } from "../../src/plugin/python_sandbox.ts";
import type {
  PyodideInstance,
  PyodideLoader,
} from "../../src/plugin/python_sandbox.ts";
import { createPluginSdk } from "../../src/plugin/sdk.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";

/**
 * Create a mock Pyodide instance for testing.
 *
 * The mock simulates Pyodide's interface:
 * - registerJsModule stores modules that Python code can reference
 * - runPythonAsync parses simple patterns to simulate Python execution
 * - globals provides a basic Map interface
 */
function createMockPyodide(): PyodideInstance {
  const registeredModules = new Map<string, Record<string, unknown>>();
  const pythonGlobals = new Map<string, unknown>();

  return {
    globals: pythonGlobals,

    registerJsModule(name: string, module: Record<string, unknown>): void {
      registeredModules.set(name, module);
    },

    async runPythonAsync(code: string): Promise<unknown> {
      // Simulate basic Python expressions for testing

      // Simple arithmetic: "1 + 1" => 2
      const arithmeticMatch = code.match(/^(\d+)\s*\+\s*(\d+)$/);
      if (arithmeticMatch) {
        return Number(arithmeticMatch[1]) + Number(arithmeticMatch[2]);
      }

      // Simple string literal: "'hello'" => "hello" or '"hello"' => "hello"
      const stringMatch = code.match(/^['"](.*)['"]$/);
      if (stringMatch) {
        return stringMatch[1];
      }

      // Simple numeric literal
      const numMatch = code.match(/^(\d+(?:\.\d+)?)$/);
      if (numMatch) {
        return Number(numMatch[1]);
      }

      // triggerfish.emit_data(content, classification) call
      const emitMatch = code.match(
        /triggerfish\.emit_data\(\s*['"](.+?)['"]\s*,\s*['"](.+?)['"]\s*\)/,
      );
      if (emitMatch) {
        const tf = registeredModules.get("triggerfish");
        if (!tf) {
          throw new Error("ModuleNotFoundError: No module named 'triggerfish'");
        }
        const emitData = tf["emit_data"] as (
          content: string,
          classification: ClassificationLevel,
        ) => Record<string, unknown>;
        return emitData(emitMatch[1], emitMatch[2] as ClassificationLevel);
      }

      // triggerfish.query(query_string) call
      const queryMatch = code.match(
        /triggerfish\.query\(\s*['"](.+?)['"]\s*\)/,
      );
      if (queryMatch) {
        const tf = registeredModules.get("triggerfish");
        if (!tf) {
          throw new Error("ModuleNotFoundError: No module named 'triggerfish'");
        }
        const queryFn = tf["query"] as (
          queryString: string,
        ) => Promise<Record<string, unknown>>;
        return await queryFn(queryMatch[1]);
      }

      // Attempt to access Deno or system APIs
      if (
        code.includes("import os") ||
        code.includes("import subprocess") ||
        code.includes("Deno.")
      ) {
        throw new Error(
          "ModuleNotFoundError: system modules are not available in sandbox",
        );
      }

      // Default: return None (null)
      return null;
    },
  };
}

/** Create a mock Pyodide loader for testing. */
function createMockLoader(): PyodideLoader {
  // deno-lint-ignore require-await
  return async () => createMockPyodide();
}

// --- PythonSandbox tests ---

Deno.test("PythonSandbox: executes Python code and returns result", async () => {
  const sdk = createPluginSdk({
    pluginName: "py-test",
    maxClassification: "INTERNAL",
  });
  const sandbox = await createPythonSandbox({
    name: "py-test",
    version: "1.0",
    declaredEndpoints: [],
    maxClassification: "INTERNAL",
    sdk,
    _pyodideLoader: createMockLoader(),
  });
  try {
    const result = await sandbox.executePython("1 + 1");
    assertEquals(result, 2);

    const strResult = await sandbox.executePython("'hello world'");
    assertEquals(strResult, "hello world");
  } finally {
    await sandbox.destroy();
  }
});

Deno.test("PythonSandbox: can access triggerfish SDK bridge", async () => {
  const sdk = createPluginSdk({
    pluginName: "py-bridge",
    maxClassification: "INTERNAL",
  });
  const sandbox = await createPythonSandbox({
    name: "py-bridge",
    version: "1.0",
    declaredEndpoints: [],
    maxClassification: "INTERNAL",
    sdk,
    _pyodideLoader: createMockLoader(),
  });
  try {
    // Query through the bridge
    const result = await sandbox.executePython(
      'triggerfish.query("SELECT * FROM data")',
    );
    const queryResult = result as { classification: string; data: unknown };
    assertEquals(queryResult.classification, "INTERNAL");
  } finally {
    await sandbox.destroy();
  }
});

Deno.test("PythonSandbox: emit_data goes through SDK classification enforcement", async () => {
  const sdk = createPluginSdk({
    pluginName: "py-emit",
    maxClassification: "INTERNAL",
  });
  const sandbox = await createPythonSandbox({
    name: "py-emit",
    version: "1.0",
    declaredEndpoints: [],
    maxClassification: "INTERNAL",
    sdk,
    _pyodideLoader: createMockLoader(),
  });
  try {
    // Valid classification should succeed
    const validResult = await sandbox.executePython(
      'triggerfish.emit_data("some data", "PUBLIC")',
    );
    const okResult = validResult as { ok: boolean };
    assertEquals(okResult.ok, true);

    // Classification above ceiling should throw
    await assertRejects(
      () =>
        sandbox.executePython(
          'triggerfish.emit_data("secret", "RESTRICTED")',
        ),
      Error,
      "exceeds ceiling",
    );
  } finally {
    await sandbox.destroy();
  }
});

Deno.test("PythonSandbox: query goes through SDK queryAsUser", async () => {
  const sdk = createPluginSdk({
    pluginName: "py-query",
    maxClassification: "CONFIDENTIAL",
  });
  const sandbox = await createPythonSandbox({
    name: "py-query",
    version: "1.0",
    declaredEndpoints: [],
    maxClassification: "CONFIDENTIAL",
    sdk,
    _pyodideLoader: createMockLoader(),
  });
  try {
    const result = await sandbox.executePython(
      'triggerfish.query("SELECT name FROM contacts")',
    );
    const queryResult = result as {
      classification: string;
      data: { query: string; rows: unknown[] };
    };
    assertEquals(queryResult.classification, "CONFIDENTIAL");
    assertEquals(queryResult.data.query, "SELECT name FROM contacts");
    assertEquals(queryResult.data.rows.length, 0);
  } finally {
    await sandbox.destroy();
  }
});

Deno.test("PythonSandbox: blocks direct Deno/system access from Python", async () => {
  const sdk = createPluginSdk({
    pluginName: "py-blocked",
    maxClassification: "PUBLIC",
  });
  const sandbox = await createPythonSandbox({
    name: "py-blocked",
    version: "1.0",
    declaredEndpoints: [],
    maxClassification: "PUBLIC",
    sdk,
    _pyodideLoader: createMockLoader(),
  });
  try {
    await assertRejects(
      () => sandbox.executePython("import os"),
      Error,
      "system modules are not available",
    );

    await assertRejects(
      () => sandbox.executePython("import subprocess"),
      Error,
      "system modules are not available",
    );
  } finally {
    await sandbox.destroy();
  }
});

Deno.test("PythonSandbox: destroy prevents further execution", async () => {
  const sdk = createPluginSdk({
    pluginName: "py-destroy",
    maxClassification: "PUBLIC",
  });
  const sandbox = await createPythonSandbox({
    name: "py-destroy",
    version: "1.0",
    declaredEndpoints: [],
    maxClassification: "PUBLIC",
    sdk,
    _pyodideLoader: createMockLoader(),
  });

  // Should work before destroy
  const result = await sandbox.executePython("42");
  assertEquals(result, 42);

  // Destroy the sandbox
  await sandbox.destroy();

  // Should fail after destroy
  await assertRejects(
    () => sandbox.executePython("1 + 1"),
    Error,
    "Sandbox has been destroyed",
  );

  // JS execution should also fail
  await assertRejects(
    () => sandbox.executePluginCode("return 1"),
    Error,
    "Sandbox has been destroyed",
  );
});

Deno.test("PythonSandbox: JS execute still works through base sandbox", async () => {
  const sdk = createPluginSdk({
    pluginName: "py-js",
    maxClassification: "INTERNAL",
  });
  const sandbox = await createPythonSandbox({
    name: "py-js",
    version: "1.0",
    declaredEndpoints: [],
    maxClassification: "INTERNAL",
    sdk,
    _pyodideLoader: createMockLoader(),
  });
  try {
    // The PythonSandbox also exposes the base execute() for JS code
    const result = await sandbox.executePluginCode("return 3 * 7");
    assertEquals(result, 21);
  } finally {
    await sandbox.destroy();
  }
});
