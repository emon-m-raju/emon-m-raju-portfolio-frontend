import ResourceState from '../components/ResourceState.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

const noExperienceMessage =
  'No professional experience yet. I am currently focused on learning and building projects.'

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

function ExperienceSection({ experiencesResource }) {
  const experiences =
    experiencesResource?.status === 'success' && Array.isArray(experiencesResource.data)
      ? experiencesResource.data.filter(
          (experience) =>
            experience && typeof experience === 'object' && !Array.isArray(experience),
        )
      : []

  return (
    <section
      className="portfolio-section panel"
      id="experience"
      aria-label="Experience"
    >
      <SectionHeading
        eyebrow="JOURNEY"
        title="Experience"
        description="Professional experience records from my portfolio."
      />
      <ResourceState
        status={experiencesResource?.status ?? 'error'}
        error={experiencesResource?.error ?? 'Experience data is unavailable.'}
        onRetry={experiencesResource?.retry}
        emptyMessage={noExperienceMessage}
      >
        {experiences.length > 0 ? (
          <ul className="experience-list">
          {experiences.map((experience, index) => (
            <li className="experience-card" key={experience.id ?? `experience-${index}`}>
              <div className="experience-card__header">
                <div>
                  {typeof experience.role === 'string' && <h3>{experience.role}</h3>}
                  {typeof experience.company === 'string' && (
                    <p className="experience-card__company">{experience.company}</p>
                  )}
                </div>
                {typeof experience.employment_type === 'string' && (
                  <span className="experience-card__type">
                    {experience.employment_type}
                  </span>
                )}
              </div>
              {typeof experience.start_date === 'string' && (
                <p className="experience-card__dates">
                  {experience.start_date}
                  {experience.is_current === true
                    ? ' – Present'
                    : typeof experience.end_date === 'string' && experience.end_date
                      ? ` – ${experience.end_date}`
                      : ''}
                </p>
              )}
              {typeof experience.location === 'string' && experience.location && (
                <p>{experience.location}</p>
              )}
              {typeof experience.description === 'string' && experience.description && (
                <p>{experience.description}</p>
              )}
              {isHttpUrl(experience.company_url) && (
                <a href={experience.company_url} target="_blank" rel="noreferrer">
                  Company website <span aria-hidden="true">↗</span>
                </a>
              )}
            </li>
          ))}
          </ul>
        ) : experiencesResource?.status === 'success' ? (
          <p className="resource-state resource-state--empty">{noExperienceMessage}</p>
        ) : null}
      </ResourceState>
    </section>
  )
}

export default ExperienceSection
