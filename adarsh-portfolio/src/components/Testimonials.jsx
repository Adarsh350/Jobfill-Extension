export default function Testimonials() {
  return (
    <section id="testimonials" style={{borderTop:'1px solid var(--color-border)',background:'var(--color-surface)'}}>
      <div className="container-shell section-pad">

        <div className="reveal" style={{textAlign:'center',marginBottom:'2rem'}}>
          <h2 style={{fontSize:'var(--text-h2)',fontWeight:800,letterSpacing:'-0.025em',margin:0,color:'var(--color-text)'}}>Their words.</h2>
        </div>

        <div className="reveal" style={{maxWidth:'640px',margin:'0 auto'}}>
          <div className="card-surface" style={{padding:'2rem 2rem 1.75rem'}}>
            <div className="quote-mark" aria-hidden="true">"</div>
            <blockquote style={{margin:'0.375rem 0 1.5rem',fontSize:'clamp(1rem,2.2vw,1.125rem)',color:'var(--color-text)',lineHeight:1.7,fontStyle:'italic'}}>
              Adarsh built a full campaign + dashboard that showed us exactly why our last agency approach failed. The report alone was worth the project fee.
            </blockquote>
            <footer style={{display:'flex',alignItems:'center',gap:'0.875rem'}}>
              <div className="avatar-initials" aria-hidden="true">SK</div>
              <div>
                <cite style={{fontStyle:'normal',fontWeight:600,color:'var(--color-text)',fontSize:'0.9375rem',display:'block'}}>Sarah K.</cite>
                <p style={{fontSize:'0.8125rem',color:'var(--color-muted)',margin:0}}>Marketing Director, B2B SaaS Company</p>
              </div>
            </footer>
          </div>
        </div>

      </div>
    </section>
  )
}
