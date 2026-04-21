import { useState } from 'react'

function CaseStudy({ id, tags, title, metric, metricLabel, metricNote, summary, problem, built, keyDecision, stats, gallery }) {
  const [open, setOpen] = useState(false)

  return (
    <article className="card-surface reveal" style={{marginBottom:'1.25rem',overflow:'hidden'}}>

      {/* Mobile summary */}
      <div className="cs-mobile-summary" style={{padding:'1.5rem 1.25rem'}}>
        <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem',marginBottom:'0.875rem'}}>
          {tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
        <h3 style={{fontSize:'1.1rem',fontWeight:700,margin:'0 0 0.875rem',color:'var(--color-text)'}}>{title}</h3>
        {metric ? (
          <>
            <div style={{display:'flex',alignItems:'baseline',gap:'0.625rem',flexWrap:'wrap',marginBottom:'0.375rem'}}>
              <span className="metric-badge">{metric}</span>
              <span style={{fontSize:'0.875rem',color:'var(--color-text)',fontWeight:600}}>{metricLabel}</span>
            </div>
            <p style={{fontSize:'0.8125rem',color:'var(--color-muted)',margin:'0 0 0.375rem'}}>{metricNote}</p>
          </>
        ) : (
          <p style={{fontSize:'0.8125rem',color:'var(--color-muted)',margin:'0 0 0.375rem',fontStyle:'italic'}}>Final metric — coming soon</p>
        )}
        <p style={{fontSize:'0.875rem',color:'var(--color-muted)',margin:0,lineHeight:1.55}}>{summary}</p>
      </div>

      {/* Desktop expandable */}
      <div className="cs-full">
        <div style={{padding:'2rem 2rem 1.75rem'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'1rem',marginBottom:'1.25rem'}}>
            <div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem',marginBottom:'0.75rem'}}>
                {tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
              <h3 style={{fontSize:'var(--text-h3)',fontWeight:700,margin:0,color:'var(--color-text)'}}>{title}</h3>
            </div>
            <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={`${id}-details`} className="btn-ghost"
              style={{padding:'0.6rem 1rem',fontSize:'0.8125rem',flexShrink:0,gap:'0.4rem'}}>
              <span>{open ? 'Close' : 'See Details'}</span>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"
                style={{transition:'transform 200ms',transform:open?'rotate(180deg)':''}}>
                <path d="M2 4.5l4.5 4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {metric ? (
            <div style={{display:'flex',alignItems:'baseline',gap:'0.75rem',flexWrap:'wrap',marginBottom:'0.625rem'}}>
              <span className="metric-badge">{metric}</span>
              <span style={{fontSize:'1rem',color:'var(--color-text)',fontWeight:600}}>{metricLabel}</span>
              <span style={{fontSize:'0.875rem',color:'var(--color-muted)'}}>{metricNote}</span>
            </div>
          ) : null}
          <p style={{fontSize:'0.9375rem',color:'var(--color-muted)',margin:0,fontStyle:metric?'normal':'italic'}}>{summary}</p>
        </div>

        {open && (
          <div id={`${id}-details`} style={{borderTop:'1px solid var(--color-border)',padding:'2rem',display:'grid',gap:'2rem'}}>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem'}}>
              <div>
                <p style={{fontSize:'0.6875rem',letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--color-muted)',fontWeight:600,margin:'0 0 0.625rem'}}>The Problem</p>
                <p style={{fontSize:'0.9375rem',color:'var(--color-text)',margin:0,lineHeight:1.6}}>{problem}</p>
              </div>
              <div>
                <p style={{fontSize:'0.6875rem',letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--color-muted)',fontWeight:600,margin:'0 0 0.625rem'}}>Built</p>
                <ul style={{margin:0,paddingLeft:'1.125rem',fontSize:'0.9375rem',color:'var(--color-text)',display:'flex',flexDirection:'column',gap:'0.35rem'}}>
                  {built.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>

            <div style={{background:'var(--color-surface-raised)',border:'1px solid var(--color-border)',borderLeft:'3px solid var(--color-accent)',borderRadius:'8px',padding:'1.125rem 1.25rem'}}>
              <p style={{fontSize:'0.6875rem',letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--color-accent)',fontWeight:600,margin:'0 0 0.375rem'}}>Key Decision</p>
              <p style={{fontSize:'0.9375rem',color:'var(--color-text)',margin:0,lineHeight:1.6}}>{keyDecision}</p>
            </div>

            <div>
              <p style={{fontSize:'0.6875rem',letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--color-muted)',fontWeight:600,margin:'0 0 0.875rem'}}>Stats</p>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${stats.length},1fr)`,gap:'0.75rem'}}>
                {stats.map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-value" style={s.tbd ? {color:'var(--color-faint)',fontSize:'1rem'} : {}}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p style={{fontSize:'0.6875rem',letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--color-muted)',fontWeight:600,margin:'0 0 0.875rem'}}>Gallery</p>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${gallery.length},1fr)`,gap:'0.625rem'}}>
                {gallery.map(label => (
                  <div key={label} className="placeholder-frame" style={{aspectRatio:'4/3',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.625rem',textAlign:'center',padding:'0.25rem'}}>{label}</div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

    </article>
  )
}

export default function Work() {
  return (
    <section id="work" style={{borderTop:'1px solid var(--color-border)'}}>
      <div className="container-shell section-pad">

        <div className="reveal" style={{marginBottom:'2.5rem'}}>
          <p className="section-label" style={{marginBottom:'0.5rem'}}>Work</p>
          <h2 style={{fontSize:'var(--text-h2)',fontWeight:800,letterSpacing:'-0.025em',margin:0,color:'var(--color-text)'}}>Real campaigns. Real numbers.</h2>
        </div>

        <CaseStudy
          id="cs1"
          tags={['SaaS', '2.4k list', 'Cold audience']}
          title="B2B SaaS Re-Engagement"
          metric="34%"
          metricLabel="open rate"
          metricNote="vs 21% B2B average"
          summary="Re-engaged a cold list and captured sales-ready leads before Q2."
          problem="2,400 subscribers inactive for 60+ days. Needed warm leads for pipeline before Q2."
          built={['3-email Mailchimp sequence','Custom landing page','Live analytics dashboard','Branded PDF report']}
          keyDecision="Switched from feature-list copy to pain-point copy and reduced the landing page form to two fields."
          stats={[
            {value:'34%',label:'Open Rate'},
            {value:'4.2%',label:'CTR'},
            {value:'61',label:'Leads Captured'},
            {value:'18%',label:'Subject Line Lift'},
          ]}
          gallery={['Email 1','Email 2','LP Desktop','LP Mobile','Dashboard','Report']}
        />

        <CaseStudy
          id="cs2"
          tags={['Campaign', 'B2B', 'Reporting']}
          title="Campaign Funnel Build"
          metric={null}
          metricLabel=""
          metricNote=""
          summary="Replace with final result summary."
          problem="Add client situation."
          built={['Email campaign','Landing page','Analytics dashboard','Branded report']}
          keyDecision="Add final strategy decision."
          stats={[
            {value:'TBD',label:'Metric 1',tbd:true},
            {value:'TBD',label:'Metric 2',tbd:true},
            {value:'TBD',label:'Metric 3',tbd:true},
            {value:'TBD',label:'Metric 4',tbd:true},
          ]}
          gallery={['Email','Landing Page','Dashboard','Report']}
        />

      </div>
    </section>
  )
}
