import Icon from '../ui/Icon.jsx'

/* Neutral stand-in for any image. Pass `image` (a URL or imported asset) to render a real <img> instead;
   `alt` is used only for real images — the placeholder itself is labelled for assistive tech via `label`. */
export default function ImagePlaceholder({ ratio = '16 / 9', label = 'Image', image, alt, className = '' }) {
  const classes = `rs-img${className ? ` ${className}` : ''}`
  if (image) {
    return (
      <div className={classes} style={{ aspectRatio: ratio }}>
        <img src={image} alt={alt ?? label} loading="lazy" />
      </div>
    )
  }
  return (
    <div className={`${classes} is-placeholder`} style={{ aspectRatio: ratio }} role="img" aria-label={`Placeholder: ${label}`}>
      <Icon name="image" size={28} />
      <span>{label}</span>
    </div>
  )
}
