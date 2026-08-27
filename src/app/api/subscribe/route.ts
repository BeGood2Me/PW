import { NextResponse } from "next/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email || !emailPattern.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Newsletter signup is not configured yet." },
      { status: 503 },
    );
  }

  const response = await fetch("https://api.buttondown.com/v1/subscribers", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email_address: email, type: "regular" }),
  });

  if (response.status === 409) {
    return NextResponse.json({ message: "You're already subscribed." });
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "Could not subscribe right now. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: "Thanks for subscribing!" });
}
