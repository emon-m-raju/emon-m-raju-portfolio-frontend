import SectionHeading from '../components/SectionHeading.jsx'

function AboutSection({ profileResource, educationResource }) {
  const profile =
    profileResource?.status === 'success' &&
    profileResource.data &&
    typeof profileResource.data === 'object' &&
    !Array.isArray(profileResource.data)
      ? profileResource.data
      : null
  const bio = typeof profile?.bio === 'string' ? profile.bio : ''
  const education = educationResource?.status === 'success' && Array.isArray(educationResource.data)
    ? educationResource.data
    : []

  return (
    <section className="about-section panel" id="about" aria-labelledby="about-title">
      <SectionHeading
        eyebrow="ABOUT"
        title="A little about me"
        description="A brief introduction and education history from the portfolio."
      />
      <div className="about-section__grid">
        <div className="about-section__introduction">
          <h3 id="about-title">Introduction</h3>
          <p>{bio || 'No biography has been provided yet.'}</p>
        </div>

        <div className="education-summary">
          <h3>Education</h3>
          {education.length > 0 ? (
            <dl className="education-summary__facts">
              {education.map((record, index) => (
                <div key={record.id ?? `${record.institution}-${index}`}>
                  <dt>{record.institution || 'Institution'}</dt>
                  <dd>
                    {[record.degree, record.field_of_study].filter(Boolean).join(' · ') || 'Education record'}
                  </dd>
                  {(record.start_year || record.end_year) && (
                    <dd>
                      {record.start_year || ''}
                      {record.end_year ? ` – ${record.end_year}` : record.start_year ? ' – Present' : ''}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          ) : (
            <p>No education records have been provided yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default AboutSection
