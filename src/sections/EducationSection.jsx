import ResourceState from '../components/ResourceState.jsx'
import SectionHeading from '../components/SectionHeading.jsx'

function EducationSection({ educationResource }) {
  const records =
    educationResource?.status === 'success' && Array.isArray(educationResource.data)
      ? educationResource.data.filter(
          (record) => record && typeof record === 'object' && !Array.isArray(record),
        )
      : []

  return (
    <section className="portfolio-section panel" id="education" aria-label="Education">
      <SectionHeading
        eyebrow="LEARNING"
        title="Education"
        description="Education records provided in my portfolio."
      />
      <ResourceState
        status={educationResource?.status ?? 'error'}
        error={educationResource?.error ?? 'Education data is unavailable.'}
        onRetry={educationResource?.retry}
        emptyMessage="No education records have been added yet."
      >
        {records.length > 0 ? (
          <ul className="education-list">
          {records.map((record, index) => (
            <li className="education-card" key={record.id ?? `${record.institution ?? 'education'}-${index}`}>
              <span className="education-card__marker" aria-hidden="true">
                +
              </span>
              <div className="education-card__content">
                {(typeof record.start_year === 'number' ||
                  typeof record.end_year === 'number') && (
                  <p className="education-card__years">
                    {typeof record.start_year === 'number' ? record.start_year : ''}
                    {typeof record.end_year === 'number'
                      ? ` – ${record.end_year}`
                      : typeof record.start_year === 'number'
                        ? ' – Present'
                        : ''}
                  </p>
                )}
                {typeof record.degree === 'string' && <h3>{record.degree}</h3>}
                {typeof record.institution === 'string' && (
                  <p className="education-card__institution">{record.institution}</p>
                )}
                {typeof record.field_of_study === 'string' && record.field_of_study && (
                  <p>{record.field_of_study}</p>
                )}
                {typeof record.grade === 'string' && record.grade && (
                  <p>Grade: {record.grade}</p>
                )}
                {typeof record.description === 'string' && record.description && (
                  <p>{record.description}</p>
                )}
              </div>
            </li>
          ))}
          </ul>
        ) : educationResource?.status === 'success' ? (
          <p className="resource-state resource-state--empty">
            No education records have been added yet.
          </p>
        ) : null}
      </ResourceState>
    </section>
  )
}

export default EducationSection
