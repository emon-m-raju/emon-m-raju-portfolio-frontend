const FALLBACK_PROFILE_IMAGE = '/profile.jpg'

/**
 * Renders the introductory hero from the public profile resource.
 * @param {{ profileResource: { status: string, data?: object } }} props
 */
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
  const avatar = [profile?.avatar, profile?.image].find(
    (value) => typeof value === 'string' && value.trim(),
  )?.trim()
  const avatarPath = avatar?.split(/[?#]/, 1)[0] ?? ''
  const isDefaultAvatar = /(?:^|\/)(?:default|default-avatar|placeholder)(?:\.(?:jpe?g|png|webp))?$/i
    .test(avatarPath)
  const avatarSrc = avatar && !isDefaultAvatar ? avatar : FALLBACK_PROFILE_IMAGE

  return (
    <section className="home-section panel" id="home" aria-labelledby="home-title">
      <div className="home-section__visual">
        <img
          alt={`${name} profile`}
          className="home-section__avatar"
          onError={(event) => {
            const image = event.currentTarget
            if (image.getAttribute('src') === FALLBACK_PROFILE_IMAGE) {
              image.hidden = true
            } else {
              image.src = FALLBACK_PROFILE_IMAGE
            }
          }}
          src={avatarSrc}
        />
      </div>
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
    </section>
  )
}

export default HomeSection
