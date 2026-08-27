"use client";

import { useState } from "react";
import { site } from "@/data/site";

export function EmailSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMessage(data.message ?? "You're subscribed!");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-5 rounded-xl bg-white/80 p-4 text-sm text-neutral-700 ring-1 ring-neutral-200">
        <p className="font-medium text-neutral-900">You&apos;re in!</p>
        <p className="mt-1">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5">
      <p className="mb-2 text-sm text-neutral-600">{site.newsletter.label}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email"
          required
          autoComplete="email"
          disabled={status === "loading"}
          className="w-full rounded-full border border-neutral-200 bg-white/90 px-4 py-2.5 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-md transition hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Subscribing..." : "Subscribe"}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
