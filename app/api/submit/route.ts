import { NextResponse } from "next/server";

/**
 * Server-side relay to the Google Apps Script web app.
 *
 * Posting from the server (instead of the browser) keeps the deployed script
 * URL private, avoids CORS preflight problems, and lets us shape a clear error
 * message when the deployment is not reachable.
 *
 * APPS_SCRIPT_URL is read from .env.local — see README.md for the 2-minute setup.
 */
const SCRIPT_URL = process.env.APPS_SCRIPT_URL?.trim();

export async function POST(request: Request) {
  if (!SCRIPT_URL) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Server is not configured yet: add APPS_SCRIPT_URL to .env.local and restart the app.",
      },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      cache: "no-store",
    });

    const text = await upstream.text();

    let parsed: { ok?: boolean; error?: string; row?: number } | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    if (!upstream.ok || parsed?.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          error:
            parsed?.error ??
            `Google Apps Script responded with status ${upstream.status}. Confirm the web app is deployed with access set to "Anyone".`,
        },
        { status: 502 },
      );
    }

    if (!parsed) {
      return NextResponse.json({
        ok: true,
        row: null,
        note: "Submitted. The script did not return JSON, but the row was written.",
      });
    }

    return NextResponse.json({ ok: true, row: parsed.row ?? null });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not reach Google Apps Script. Check your internet connection and that the deployment URL is correct.",
      },
      { status: 502 },
    );
  }
}
