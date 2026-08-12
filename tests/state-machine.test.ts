import { describe, expect, it } from "vitest";
import { transition } from "@/lib/dispatch/state-machine";

describe("completion authorization", () => {
  it("requires an agent or operations role", () => expect(() => transition("OTP_PENDING", "COMPLETED", "CUSTOMER")).toThrow("Only an agent"));
});
