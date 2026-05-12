/// <reference types="node" />

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();

describe("admin role guardrails", () => {
  it("keeps the auth hook from prioritizing president over admin", () => {
    const authHook = readFileSync(join(projectRoot, "src/hooks/useAuth.tsx"), "utf8");

    expect(authHook.indexOf('roles.includes("admin")')).toBeLessThan(
      authHook.indexOf('roles.includes("president")'),
    );
  });

  it("documents that RLS policies must use the internal role helper", () => {
    const migrations = readFileSync(join(projectRoot, "supabase/migrations/20260512214153_8f88cdf3-f6d4-4cc4-af2d-75190d375868.sql"), "utf8");

    expect(migrations).not.toContain("public.has_role(auth.uid()");
    expect(migrations).toContain("private.has_role(auth.uid()");
  });
});