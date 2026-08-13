import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyWebhookSignature } from "./webhook";

const SECRET = "test-webhook-secret";
const PAYLOAD = '{"action":"opened","number":42}';

function sign(payload: string, secret: string): string {
  return (
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex")
  );
}

describe("verifyWebhookSignature", () => {
  it("accepts a correctly-signed payload", () => {
    const sig = sign(PAYLOAD, SECRET);
    expect(verifyWebhookSignature(PAYLOAD, sig, SECRET)).toBe(true);
  });

  it("rejects a payload signed with a different secret", () => {
    const sig = sign(PAYLOAD, "other-secret");
    expect(verifyWebhookSignature(PAYLOAD, sig, SECRET)).toBe(false);
  });

  it("rejects a null signature header", () => {
    expect(verifyWebhookSignature(PAYLOAD, null, SECRET)).toBe(false);
  });

  it("rejects a signature of the wrong length", () => {
    expect(verifyWebhookSignature(PAYLOAD, "sha256=deadbeef", SECRET)).toBe(
      false
    );
  });

  it("rejects a malformed signature entirely", () => {
    expect(verifyWebhookSignature(PAYLOAD, "not-a-hmac", SECRET)).toBe(false);
  });

  it("rejects when the payload has been tampered with", () => {
    const sig = sign(PAYLOAD, SECRET);
    const tampered = PAYLOAD.replace("42", "43");
    expect(verifyWebhookSignature(tampered, sig, SECRET)).toBe(false);
  });

  it("is case-sensitive on the sha256 prefix", () => {
    const sig = sign(PAYLOAD, SECRET).replace("sha256=", "SHA256=");
    expect(verifyWebhookSignature(PAYLOAD, sig, SECRET)).toBe(false);
  });
});
