function HomeSection({ profileResource }) {
  const profile =
    profileResource?.status === 'success' &&
    profileResource.data &&
    typeof profileResource.data === 'object' &&
    !Array.isArray(profileResource.data)
      ? profileResource.data
      : null
  const name = typeof profile?.full_name === 'string' && profile.full_name.trim()
    ? profile.full_name
    : 'Portfolio'
  const headline = typeof profile?.headline === 'string' ? profile.headline : ''
  const githubUrl = typeof profile?.github_url === 'string' ? profile.github_url : ''
  const biography = typeof profile?.bio === 'string' && profile.bio.trim()
    ? profile.bio
    : ''

  return (
    <section className="home-section panel" id="home" aria-labelledby="home-title">
      <div className="home-section__content">
        <p className="welcome__eyebrow">PERSONAL PORTFOLIO</p>
        <p className="home-section__terminal-line">
          <span aria-hidden="true">$</span> whoami
        </p>
        <h1 id="home-title">{name}</h1>
        <p className="home-section__headline">{headline}</p>
        {biography && <p className="home-section__introduction">{biography}</p>}
        <div className="home-section__actions">
          <a className="button button--primary" href="#projects">
            View projects
          </a>
          <a className="button button--secondary" href="#contact">
            Contact me
          </a>
          {/^https?:\/\//i.test(githubUrl) && (
            <a
              className="home-section__github"
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Visit the portfolio owner on GitHub (opens in a new tab)"
            >
              GitHub <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
      <div className="home-section__prompt" aria-hidden="true">
        <span>~/portfolio</span>
        <span className="home-section__prompt-line">ready<span>_</span></span>
      </div>
    </section>
  )
}

export default HomeSection
