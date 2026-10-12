import Icon from './Icon.jsx'

/* Square icon-only control. `label` is required: it becomes the accessible name. */
export default function IconButton({ icon, label, size = 20, variant = 'outline', className = '', ...rest }) {
  return (
    <button type="button" className={`ui-ibtn ui-ibtn--${variant}${className ? ` ${className}` : ''}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  )
}
