import { expect, test } from "@playwright/test";

// The `.invalid` TLD never resolves (RFC 6761): a server that called itself back at the Host the
// browser used would fail here, as it does behind a port-forward or a reverse proxy.
const UNREACHABLE_HOST = "app.invalid";

test("renders the home page when the request's Host is not reachable from the server", async ({
  request,
}) => {
  const response = await request.get("/", { headers: { host: UNREACHABLE_HOST } });

  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("Recent greetings");
  expect(html).toMatch(/<button[^>]*type="submit"/);
});
