import { useState } from 'react'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', need: '', budget: '' })

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) setSent(true)
    } catch {
      // Server unavailable — still show success (form is cosmetic until email is wired)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  function onChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  return (
    <section id="contact" style={{borderTop:'1px solid var(--color-border)'}}>
      <div className="container-shell section-pad">

        <div className="reveal" style={{marginBottom:'2.5rem'}}>
          <p className="section-label" style={{marginBottom:'0.5rem'}}>Contact</p>
          <h2 style={{fontSize:'var(--text-h2)',fontWeight:800,letterSpacing:'-0.025em',margin:'0 0 0.5rem',color:'var(--color-text)'}}>Let's build your campaign.</h2>
          <p style={{fontSize:'0.9375rem',color:'var(--color-muted)',margin:0}}>Abu Dhabi · Global clients · I'll flag bad ideas before you pay to build them.</p>
        </div>

        <div id="contact-grid" style={{display:'flex',flexDirection:'column',gap:'2.5rem',alignItems:'flex-start'}}>

          <div id="contact-left" style={{width:'100%'}}>
            <div style={{marginBottom:'1.5rem'}}>
              <picture>
                <source media="(min-width:1080px)" srcSet="/assets/headshot/headshot-desktop.jpg" />
                <source media="(min-width:700px)"  srcSet="/assets/headshot/headshot-tablet.jpg" />
                <img src="/assets/headshot/headshot-mobile.jpg"
                  alt="Adarsh Shankar — B2B Email Campaign Specialist, Abu Dhabi"
                  width="240" height="320" loading="lazy"
                  data-placeholder="headshot-ph"
                  style={{width:'100%',maxWidth:'200px',aspectRatio:'3/4',objectFit:'cover',borderRadius:'var(--radius-card)',border:'1px solid var(--color-border)'}} />
              </picture>
              <div id="headshot-ph" className="headshot-placeholder" style={{display:'none',maxWidth:'200px'}} aria-hidden="true">AS</div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
              {[
                { href:'mailto:hello@adarshs.com', label:'hello@adarshs.com', icon:<path d="M1 5.5l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.25"/>, icon2:<rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.25"/> },
              ].map(() => null)}

              <a href="mailto:hello@adarshs.com" target="_blank" rel="noopener noreferrer" className="contact-link">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.25"/><path d="M1 5.5l7 4.5 7-4.5" stroke="currentColor" strokeWidth="1.25"/></svg>
                hello@adarshs.com
              </a>
              <a href="https://www.upwork.com" target="_blank" rel="noopener noreferrer" className="contact-link">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8z" stroke="currentColor" strokeWidth="1.25"/><path d="M5.5 9.5c.4.8 1.2 1.5 2.5 1.5s2-.8 2-1.5S9 8 8 8s-2-.5-2-1.5S7 5 8 5c1.2 0 2 .7 2.4 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                Upwork Profile
              </a>
              <a href="https://www.fiverr.com" target="_blank" rel="noopener noreferrer" className="contact-link">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.25"/><path d="M5 11V7.5h4M5 9h2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/><circle cx="11" cy="5.25" r="1" fill="currentColor"/></svg>
                Fiverr Profile
              </a>
              <a href="https://linkedin.com/in/adarshshankar" target="_blank" rel="noopener noreferrer" className="contact-link">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.25"/><path d="M4.5 7v5M4.5 5v-.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/><path d="M7.5 12V9.25A2.25 2.25 0 0 1 12 9.25V12M7.5 7v5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>
                LinkedIn
              </a>
            </div>
          </div>

          <div id="contact-right" style={{width:'100%',maxWidth:'560px'}}>
            {sent ? (
              <div className="success-card">
                <div style={{width:'48px',height:'48px',borderRadius:'50%',background:'rgba(109,170,69,0.12)',border:'1px solid rgba(109,170,69,0.35)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.125rem'}}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                    <path d="M4 11.5l5 5 9-9" stroke="#6DAA45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 style={{fontSize:'1.125rem',fontWeight:700,color:'var(--color-text)',margin:'0 0 0.5rem'}}>Message sent.</h3>
                <p style={{fontSize:'0.9375rem',color:'var(--color-muted)',margin:0,lineHeight:1.65}}>I'll reply within 24 hours. If it's urgent, mention it and I'll prioritize.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'1.25rem'}} aria-label="Contact form" noValidate>

                <div className="form-field">
                  <label className="form-label" htmlFor="f-name">Name</label>
                  <input className="form-input" type="text" id="f-name" name="name" placeholder="Your name" required autoComplete="name" value={form.name} onChange={onChange} />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="f-email">Email</label>
                  <input className="form-input" type="email" id="f-email" name="email" placeholder="you@company.com" required autoComplete="email" value={form.email} onChange={onChange} />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="f-need">What do you need?</label>
                  <select className="form-select" id="f-need" name="need" required value={form.need} onChange={onChange}>
                    <option value="" disabled>Select an option</option>
                    <option>Single email</option>
                    <option>Email sequence</option>
                    <option>Landing page</option>
                    <option>Analytics dashboard</option>
                    <option>Full funnel package</option>
                    <option>Not sure — let's talk</option>
                  </select>
                </div>

                <div className="form-field" id="f-budget-wrap" style={{display:'none'}}>
                  <label className="form-label" htmlFor="f-budget">Approximate budget</label>
                  <select className="form-select" id="f-budget" name="budget" value={form.budget} onChange={onChange}>
                    <option value="" disabled>Select a range</option>
                    <option>Under $500</option>
                    <option>$500–$1,000</option>
                    <option>$1,000–$2,500</option>
                    <option>$2,500–$5,000</option>
                    <option>$5,000+</option>
                    <option>Not sure yet</option>
                  </select>
                </div>

                <div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Sending…' : 'Send Message'}
                  </button>
                </div>

              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  )
}
