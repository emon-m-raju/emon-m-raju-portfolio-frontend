import ResourceState from '../components/ResourceState.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

function formatCategory(category) {
  return category
    .split('_')
    .map((part) => part.toLowerCase())
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Groups the public skill collection by its API-provided category.
 * @param {{ skillsResource: { status: string, data?: object[], error?: string, retry?: () => void } }} props
 */
function SkillsSection({ skillsResource }) {
  const skills =
    skillsResource?.status === 'success' && Array.isArray(skillsResource.data)
      ? skillsResource.data.filter(
          (skill) => skill && typeof skill === 'object' && !Array.isArray(skill),
        )
      : []
  const groups = skills.reduce((result, skill) => {
    const category =
      typeof skill.category === 'string' && skill.category
        ? skill.category
        : 'Uncategorized'
    result[category] ??= []
    result[category].push(skill)
    return result
  }, {})

  return (
    <section className="portfolio-section panel" id="skills" aria-label="Skills">
      <SectionHeading
        eyebrow="TOOLKIT"
        title="Skills"
        description="Skills listed in my portfolio."
      />
      <ResourceState
        status={skillsResource?.status ?? 'error'}
        error={skillsResource?.error ?? 'Skills data is unavailable.'}
        loadingVariant="skills"
        onRetry={skillsResource?.retry}
        emptyTitle="No skills yet"
        emptyMessage="No skills have been added yet."
      >
        <div className="skill-groups">
          {Object.entries(groups).map(([category, categorySkills]) => (
            <section className="skill-group" key={category} aria-label={formatCategory(category)}>
              <h3 className="skill-group__title">
                <span aria-hidden="true">#</span> {formatCategory(category)}
              </h3>
              <ul className="skill-list">
                {categorySkills.map((skill) => (
                  <li className="skill-card" key={skill.id}>
                    {typeof skill.name === 'string' && (
                      <span className="skill-card__name">{skill.name}</span>
                    )}
                    {typeof skill.proficiency === 'number' &&
                      Number.isFinite(skill.proficiency) && (
                      <span className="skill-card__proficiency">
                        {skill.proficiency}%
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </ResourceState>
    </section>
  )
}

export default SkillsSection
