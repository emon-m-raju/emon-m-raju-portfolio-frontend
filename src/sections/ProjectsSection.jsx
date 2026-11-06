import ResourceState from '../components/ResourceState.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

function isHttpUrl(value) {
  if (typeof value !== 'string' || !value) {
    return false
  }

  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

function formatCategory(category) {
  return category
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function getTechnologyNames(techStack, skillsById) {
  if (!Array.isArray(techStack)) {
    return []
  }

  return techStack
    .map((technology) => {
      if (typeof technology === 'string') {
        return technology
      }
      if (
        technology &&
        typeof technology === 'object' &&
        !Array.isArray(technology) &&
        typeof technology.name === 'string'
      ) {
        return technology.name
      }
      return typeof technology === 'number' ? skillsById.get(technology) : undefined
    })
    .filter((name) => typeof name === 'string' && name.length > 0)
}

function ProjectsSection({ projectsResource, skillsResource }) {
  const skillsById = new Map(
    skillsResource?.status === 'success' && Array.isArray(skillsResource.data)
      ? skillsResource.data
          .filter(
            (skill) =>
              skill &&
              typeof skill === 'object' &&
              !Array.isArray(skill) &&
              typeof skill.name === 'string',
          )
          .map((skill) => [skill.id, skill.name])
      : [],
  )
  const projects =
    projectsResource?.status === 'success' && Array.isArray(projectsResource.data)
      ? projectsResource.data.filter(
          (project) => project && typeof project === 'object' && !Array.isArray(project),
        )
      : []

  return (
    <section className="portfolio-section panel" id="projects" aria-label="Projects">
      <SectionHeading
        eyebrow="SELECTED WORK"
        title="Projects"
        description="Projects and details available in my portfolio."
      />
      <ResourceState
        status={projectsResource?.status ?? 'error'}
        error={projectsResource?.error ?? 'Project data is unavailable.'}
        onRetry={projectsResource?.retry}
        emptyMessage="No projects have been added yet."
      >
        {projects.length > 0 ? (
          <div className="project-grid">
          {projects.map((project, index) => {
            const technologies = getTechnologyNames(project.tech_stack, skillsById)

            return (
              <article
                className="project-card"
                key={project.id ?? `project-${project.slug ?? index}`}
              >
                {isHttpUrl(project.cover_image) && (
                  <img
                    className="project-card__image"
                    src={project.cover_image}
                    alt=""
                    loading="lazy"
                  />
                )}
                <div className="project-card__body">
                  <div className="project-card__heading">
                    {typeof project.title === 'string' && <h3>{project.title}</h3>}
                    {typeof project.category === 'string' && project.category && (
                      <span className="project-card__category">
                        {formatCategory(project.category)}
                      </span>
                    )}
                  </div>
                  {typeof project.description === 'string' && project.description && (
                    <p className="project-card__description">{project.description}</p>
                  )}
                  {technologies.length > 0 && (
                    <ul className="project-card__technologies" aria-label="Technologies">
                      {technologies.map((technology) => (
                        <li key={technology}>{technology}</li>
                      ))}
                    </ul>
                  )}
                  <div className="project-card__links">
                    {isHttpUrl(project.github_url) && (
                      <a href={project.github_url} target="_blank" rel="noreferrer">
                        GitHub <span aria-hidden="true">↗</span>
                      </a>
                    )}
                    {isHttpUrl(project.live_url) && (
                      <a href={project.live_url} target="_blank" rel="noreferrer">
                        Live demo <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
          </div>
        ) : projectsResource?.status === 'success' ? (
          <p className="resource-state resource-state--empty">
            No projects have been added yet.
          </p>
        ) : null}
      </ResourceState>
    </section>
  )
}

export default ProjectsSection
