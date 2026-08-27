import { projects } from "@/data/projects";
import { ProjectCard } from "./ProjectCard";

export function Projects() {
  return (
    <section className="grid gap-5 sm:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard key={project.url} {...project} />
      ))}
    </section>
  );
}
