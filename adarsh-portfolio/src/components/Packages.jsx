export default function Packages() {
  return (
    <section id="packages" style={{borderTop:'1px solid var(--color-border)',background:'var(--color-surface)'}}>
      <div className="container-shell section-pad">

        <div className="reveal" style={{marginBottom:'2.5rem'}}>
          <p className="section-label" style={{marginBottom:'0.5rem'}}>Packages</p>
          <h2 style={{fontSize:'var(--text-h2)',fontWeight:800,letterSpacing:'-0.025em',margin:'0 0 0.5rem',color:'var(--color-text)'}}>Three ways to start.</h2>
          <p style={{fontSize:'0.9375rem',color:'var(--color-muted)',margin:0}}>Scoped to emails, list size, tools, and deliverables.</p>
        </div>

        {/* Mobile compact table */}
        <div id="pkg-mobile" className="card-surface reveal" style={{overflow:'hidden'}}>
          <div className="phone-pricing-grid" style={{borderBottom:'1px solid var(--color-border)'}}>
            <div className="pricing-col">
              <p className="pricing-name" style={{color:'var(--color-muted)',margin:'0 0 4px'}}>Starter</p>
              <p className="pricing-price" style={{color:'var(--color-text)',margin:0}}>$350–$500</p>
            </div>
            <div className="pricing-col" style={{background:'rgba(224,122,88,0.07)',borderTop:'2px solid var(--color-accent)'}}>
              <p className="pricing-name" style={{color:'var(--color-accent)',margin:'0 0 4px'}}>Growth</p>
              <p className="pricing-price" style={{color:'var(--color-text)',margin:0}}>$850–$1,200</p>
            </div>
            <div className="pricing-col">
              <p className="pricing-name" style={{color:'var(--color-muted)',margin:'0 0 4px'}}>Full&nbsp;Funnel</p>
              <p className="pricing-price" style={{color:'var(--color-text)',margin:0}}>$1,400–<br/>$2,000/mo</p>
            </div>
          </div>
          <div className="phone-pricing-grid">
            <div className="pricing-col">
              <p className="pricing-bullet" style={{color:'var(--color-muted)',margin:'0 0 3px'}}>1–3 emails</p>
              <p className="pricing-bullet" style={{color:'var(--color-muted)',margin:'0 0 3px'}}>No page</p>
              <p className="pricing-bullet" style={{color:'var(--color-muted)',margin:0}}>Metrics summary</p>
            </div>
            <div className="pricing-col" style={{background:'rgba(224,122,88,0.04)'}}>
              <p className="pricing-bullet" style={{color:'var(--color-muted)',margin:'0 0 3px'}}>1–3 emails</p>
              <p className="pricing-bullet" style={{color:'var(--color-muted)',margin:'0 0 3px'}}>Landing page</p>
              <p className="pricing-bullet" style={{color:'var(--color-muted)',margin:0}}>Live dashboard</p>
            </div>
            <div className="pricing-col">
              <p className="pricing-bullet" style={{color:'var(--color-muted)',margin:'0 0 3px'}}>2–4/mo</p>
              <p className="pricing-bullet" style={{color:'var(--color-muted)',margin:'0 0 3px'}}>Landing page</p>
              <p className="pricing-bullet" style={{color:'var(--color-muted)',margin:0}}>Monthly report</p>
            </div>
          </div>
          <div style={{padding:'1rem 0.75rem',borderTop:'1px solid var(--color-border)'}}>
            <a href="#contact" className="btn-primary" style={{display:'flex',width:'100%',justifyContent:'center'}}>Get a Quote</a>
          </div>
        </div>

        {/* Full 3-card layout (tab+) */}
        <div id="pkg-cards" style={{display:'none',gridTemplateColumns:'1fr 1fr 1fr',gap:'1.25rem',alignItems:'stretch'}}>

          <div className="package-card-base reveal" style={{padding:'1.75rem',display:'flex',flexDirection:'column',gap:'1.125rem'}}>
            <div>
              <p style={{fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--color-muted)',margin:'0 0 0.375rem'}}>Starter</p>
              <p style={{fontSize:'0.9375rem',fontWeight:600,color:'var(--color-text)',margin:'0 0 0.25rem'}}>One-off campaigns</p>
              <p style={{fontSize:'0.8125rem',color:'var(--color-muted)',margin:0,lineHeight:1.5}}>Copywriting, clean Mailchimp design, basic testing, metrics summary.</p>
            </div>
            <div style={{flex:1,borderTop:'1px solid var(--color-border)',paddingTop:'1rem'}}>
              <div className="pkg-row"><span className="pkg-row-label">Emails</span><span className="pkg-row-value">1–3</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Landing page</span><span className="pkg-row-dash">—</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Dashboard</span><span className="pkg-row-dash">—</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Report</span><span className="pkg-row-value">Metrics summary</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Timeline</span><span className="pkg-row-value">5–7 days</span></div>
            </div>
            <div>
              <p style={{fontSize:'1.875rem',fontWeight:800,color:'var(--color-text)',margin:'0 0 1rem',letterSpacing:'-0.02em'}}>$350–$500</p>
              <a href="#contact" className="btn-ghost" style={{display:'flex',width:'100%',justifyContent:'center'}}>Get a Quote</a>
            </div>
          </div>

          <div className="package-card-featured reveal" style={{padding:'1.75rem',paddingTop:'2.75rem',display:'flex',flexDirection:'column',gap:'1.125rem'}}>
            <div style={{position:'absolute',top:'-1px',left:'50%',transform:'translateX(-50%)'}}>
              <span style={{background:'var(--color-accent)',color:'var(--color-bg)',fontSize:'0.6875rem',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',padding:'0.3rem 1rem',borderRadius:'0 0 8px 8px',display:'block',whiteSpace:'nowrap'}}>Most Popular</span>
            </div>
            <div>
              <p style={{fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--color-accent)',margin:'0 0 0.375rem'}}>Growth</p>
              <p style={{fontSize:'0.9375rem',fontWeight:600,color:'var(--color-text)',margin:'0 0 0.25rem'}}>Lead gen + full tracking</p>
              <p style={{fontSize:'0.8125rem',color:'var(--color-muted)',margin:0,lineHeight:1.5}}>Copywriting, Mailchimp design, A/B testing, landing page, live reporting.</p>
            </div>
            <div style={{flex:1,borderTop:'1px solid rgba(224,122,88,0.2)',paddingTop:'1rem'}}>
              <div className="pkg-row"><span className="pkg-row-label">Emails</span><span className="pkg-row-value">1–3</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Landing page</span><span style={{color:'#6DAA45',fontWeight:600,fontSize:'0.875rem'}}>Yes</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Dashboard</span><span style={{color:'#6DAA45',fontWeight:600,fontSize:'0.875rem'}}>Live</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Report</span><span className="pkg-row-value">Full branded report</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Timeline</span><span className="pkg-row-value">10–14 days</span></div>
            </div>
            <div>
              <p style={{fontSize:'1.875rem',fontWeight:800,color:'var(--color-text)',margin:'0 0 1rem',letterSpacing:'-0.02em'}}>$850–$1,200</p>
              <a href="#contact" className="btn-primary" style={{display:'flex',width:'100%',justifyContent:'center'}}>Get a Quote</a>
            </div>
          </div>

          <div className="package-card-base reveal" style={{padding:'1.75rem',display:'flex',flexDirection:'column',gap:'1.125rem'}}>
            <div>
              <p style={{fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--color-muted)',margin:'0 0 0.375rem'}}>Full Funnel</p>
              <p style={{fontSize:'0.9375rem',fontWeight:600,color:'var(--color-text)',margin:'0 0 0.25rem'}}>Ongoing monthly marketing</p>
              <p style={{fontSize:'0.8125rem',color:'var(--color-muted)',margin:0,lineHeight:1.5}}>Monthly emails, landing page iteration, reporting rhythm, conversion visibility.</p>
            </div>
            <div style={{flex:1,borderTop:'1px solid var(--color-border)',paddingTop:'1rem'}}>
              <div className="pkg-row"><span className="pkg-row-label">Emails</span><span className="pkg-row-value">2–4/month</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Landing page</span><span className="pkg-row-value">Monthly</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Dashboard</span><span className="pkg-row-value">Monthly</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Report</span><span className="pkg-row-value">Monthly branded</span></div>
              <div className="pkg-row"><span className="pkg-row-label">Timeline</span><span className="pkg-row-value">Monthly retainer</span></div>
            </div>
            <div>
              <p style={{fontSize:'1.875rem',fontWeight:800,color:'var(--color-text)',margin:'0 0 1rem',letterSpacing:'-0.02em'}}>$1,400–$2,000<span style={{fontSize:'1rem',fontWeight:500,color:'var(--color-muted)'}}>/mo</span></p>
              <a href="#contact" className="btn-ghost" style={{display:'flex',width:'100%',justifyContent:'center'}}>Get a Quote</a>
            </div>
          </div>

        </div>

        <p className="reveal" style={{fontSize:'0.8125rem',color:'var(--color-faint)',marginTop:'1.5rem',textAlign:'center'}}>
          Single emails, standalone dashboards, and custom reports are also available.
        </p>

      </div>
    </section>
  )
}
