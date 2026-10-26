import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const http = httpRouter();

// Auth routes (includes SSO via Convex auth provider)
auth.addHttpRoutes(http);

// ── Credentials API ─────────────────────────────────────────
// GET /api/credentials?integration=asana
// Authorization: Bearer <SSO_SHARED_SECRET>
// Returns: { integration, values: [{ key, value }] }

http.route({
  path: "/api/credentials",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.SSO_SHARED_SECRET;
    if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);
    const integrationSlug = url.searchParams.get("integration");

    if (!integrationSlug) {
      return new Response(
        JSON.stringify({ error: "Missing ?integration= parameter" }),
        { status: 400, headers: corsHeaders() },
      );
    }

    const values = await ctx.runQuery(internal.integrations.getValues, {
      integrationSlug,
    });

    return new Response(JSON.stringify({ integration: integrationSlug, values }), {
      status: 200,
      headers: corsHeaders(),
    });
  }),
});

// POST /api/credentials
// Authorization: Bearer <SSO_SHARED_SECRET>
// Body: { integrationSlug, key, value }
// Writes/updates a credential value. Used for admin sync between environments.
http.route({
  path: "/api/credentials",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.SSO_SHARED_SECRET;
    if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: corsHeaders(),
      });
    }

    const body = await request.json();
    const { integrationSlug, key, value } = body;

    if (!integrationSlug || !key || value === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing integrationSlug, key, or value" }),
        { status: 400, headers: corsHeaders() },
      );
    }

    await ctx.runMutation(internal.integrations.setValueInternal, {
      integrationSlug,
      key,
      value,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(),
    });
  }),
});

// CORS preflight
http.route({
  path: "/api/credentials",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }),
});

// ── Seed endpoint ───────────────────────────────────────────
http.route({
  path: "/api/seed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.SSO_SHARED_SECRET;
    if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders(),
      });
    }

    await ctx.runMutation(internal.integrations.seed);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(),
    });
  }),
});

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

export default http;
