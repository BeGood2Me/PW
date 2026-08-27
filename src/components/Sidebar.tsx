import { site } from "@/data/site";
import { EmailSignup } from "./EmailSignup";

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Sidebar() {
  return (
    <aside className="lg:sticky lg:top-10 lg:self-start">
      <h1 className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
        {site.name}
      </h1>

      {site.bio ? (
        <p className="mt-4 text-base leading-relaxed text-neutral-600">
          {site.bio}
        </p>
      ) : null}

      <a
        href={site.social.twitter}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="X"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-lg"
      >
        <XIcon />
        Follow on X
      </a>

      <EmailSignup />
    </aside>
  );
}
