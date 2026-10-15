import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import logo from '../assets/altiusnxt_logo.png'
import { ArrowRight, BookOpen, Building2, ChevronRight, LayoutGrid, Mail, ScanSearch } from 'lucide-react'
import Icon from './ui/Icon.jsx'
import './Header.css'

const navigation = [
  { to: '/about-us', label: 'About Us', hint: 'Our story, team and clients', Ico: Building2 },
  { to: '/catalogwiz', label: 'CatalogWiz', hint: 'AI enrichment, engineer-verified', Ico: LayoutGrid },
  { to: '/ai-readiness-report', label: 'AI Readiness', hint: 'See how AI reads your pages', Ico: ScanSearch },
  { to: '/resources', label: 'Resources', hint: 'Case studies, guides, events', Ico: BookOpen },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const close = () => setOpen(false)

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 12)
    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
    return () => window.removeEventListener('scroll', updateScroll)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}${open ? ' menu-open' : ''}`}>
      <div className="wrap">
        <Link className="brand" to="/" aria-label="AltiusNxt home" onClick={close}>
          <img className="brand-logo" src={logo} alt="AltiusNxt" />
        </Link>
        <nav className="nav" aria-label="Primary">
          {navigation.map(({ to, label }) => (to.includes('#')
            ? <Link key={to} className="nav-link" to={to}>{label}</Link>
            : (
              <NavLink key={to} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} to={to}>
                {label}
              </NavLink>
            )))}
          <Link className="btn btn-primary header-cta" to="/contact#contact-form"><Mail size={17} />Talk to a Product Data Engineer</Link>
        </nav>
        <button
          className="nav-toggle"
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="nav-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} size={24} />
        </button>
      </div>
      {open && (
        <>
          <div className="nav-backdrop" onClick={close} aria-hidden="true" />
          <nav className="nav-mobile open" id="nav-mobile" aria-label="Mobile primary">
            {navigation.map(({ to, label, hint, Ico }, i) => {
              const inner = (
                <>
                  <span className="nm-ico"><Ico size={18} strokeWidth={2} /></span>
                  <span className="nm-txt"><b>{label}</b><small>{hint}</small></span>
                  <ChevronRight className="nm-chev" size={18} />
                </>
              )
              return to.includes('#')
                ? <Link key={to} className="nm-item" style={{ '--i': i }} to={to} onClick={close}>{inner}</Link>
                : (
                  <NavLink key={to} className={({ isActive }) => `nm-item${isActive ? ' is-active' : ''}`} style={{ '--i': i }} to={to} onClick={close}>
                    {inner}
                  </NavLink>
                )
            })}
            <div className="nm-cta" style={{ '--i': navigation.length }}>
              <Link className="btn btn-primary" to="/ai-readiness-report" onClick={close}>Get free AI Readiness Report <ArrowRight size={16} /></Link>
              <Link className="btn btn-outline" to="/contact#contact-form" onClick={close}>Talk to a Product Data Engineer</Link>
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
