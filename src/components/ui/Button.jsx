import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'

/* Shared button. variant: primary | secondary | outline | text. size: md (48px) | sm (40px).
   Pass `to` for in-app routes, `href` for anchors / external / mailto, otherwise it renders a <button>.
   `icon` defaults to a right arrow; use icon={null} for none, or 'download' / 'calendar' / 'check-circle'. */
export default function Button({ variant = 'primary', size = 'md', to, href, icon = 'arrow-right', iconPosition = 'end', external, className = '', children, ...rest }) {
  const isExternal = external ?? Boolean(href && /^https?:/.test(href))
  const cls = `ui-btn ui-btn--${variant}${size === 'sm' ? ' ui-btn--sm' : ''}${className ? ` ${className}` : ''}`
  const ic = icon ? <Icon name={isExternal && icon === 'arrow-right' ? 'arrow-up-right' : icon} size={size === 'sm' ? 16 : 18} /> : null
  const body = <>{iconPosition === 'start' && ic}<span className="ui-btn-label">{children}</span>{iconPosition !== 'start' && ic}</>
  if (to) return <Link className={cls} to={to} {...rest}>{body}</Link>
  if (href) return <a className={cls} href={href} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>{body}</a>
  return <button type="button" className={cls} {...rest}>{body}</button>
}
