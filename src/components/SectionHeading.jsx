/**
 * Renders consistent section titles, optionally using a different heading level.
 * @param {{ eyebrow?: string, title: string, description?: string, as?: string, id?: string }} props
 */
function SectionHeading({ eyebrow, title, description, as: Heading = 'h2', id }) {
  return (
    <div className="section-heading">
      {eyebrow && <p className="section-heading__eyebrow">{eyebrow}</p>}
      <Heading className="section-heading__title" id={id}>{title}</Heading>
      {description && <p className="section-heading__description">{description}</p>}
    </div>
  )
}

export default SectionHeading
