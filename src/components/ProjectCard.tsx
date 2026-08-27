import type { Project } from "@/data/projects";

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ProjectCard({
  name,
  url,
  description,
  iconUrl,
  accent,
  accentText,
  accentRing,
}: Project) {
  const hostname = new URL(url).hostname.replace(/^www\./, "");

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white/90 p-5 shadow-md ring-2 ring-white/80 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl hover:ring-4 ${accentRing}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accent}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconUrl}
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900">{name}</h3>
            <p className="text-xs text-neutral-400">{hostname}</p>
          </div>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 transition-all group-hover:bg-neutral-900 group-hover:text-white">
          <ArrowIcon />
        </span>
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-neutral-600">
        {description}
      </p>

      <span
        className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold ${accentText}`}
      >
        Visit site
        <ArrowIcon />
      </span>
    </a>
  );
}
