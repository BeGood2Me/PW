import { FactoryDefenseGame } from "@/components/FactoryDefenseGame";
import { Projects } from "@/components/Projects";
import { Sidebar } from "@/components/Sidebar";

export default function Home() {
  return (
    <div className="relative min-h-full overflow-x-hidden">
      <div
        className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl"
        aria-hidden="true"
      />

      <main className="relative mx-auto flex min-h-full max-w-6xl flex-col gap-12 px-6 py-12 sm:px-8 sm:py-16 lg:flex-row lg:gap-16">
        <div className="w-full shrink-0 lg:w-72">
          <Sidebar />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            My projects
          </p>
          <Projects />
        </div>
      </main>

      <FactoryDefenseGame />
    </div>
  );
}
