export default function Hero() {
  return (
    <header id="hero" style={{minHeight:'100dvh',display:'flex',alignItems:'center',paddingTop:'var(--nav-h-mobile)',position:'relative',overflow:'hidden'}}>

      <div style={{position:'absolute',top:'15%',right:'-5%',width:'480px',height:'480px',background:'rgba(224,122,88,0.05)',borderRadius:'50%',filter:'blur(100px)',pointerEvents:'none'}} aria-hidden="true"></div>

      <div className="container-shell" style={{paddingBlock:'clamp(2.5rem,6vw,5rem)'}}>
        <div id="hero-grid" style={{display:'flex',flexDirection:'column',gap:'3rem',alignItems:'flex-start'}}>

          <div className="reveal" style={{display:'flex',flexDirection:'column',gap:'1.375rem',maxWidth:'640px'}}>

            <div style={{display:'inline-flex',alignItems:'center',gap:'0.5rem',background:'var(--color-surface-raised)',border:'1px solid var(--color-border)',borderRadius:'var(--radius-pill)',padding:'0.4rem 0.875rem',width:'fit-content'}}>
              <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'var(--color-accent)',flexShrink:0}} aria-hidden="true"></span>
              <span style={{fontSize:'0.6875rem',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--color-accent)'}}>B2B Email Campaign Specialist</span>
            </div>

            <h1 style={{fontSize:'var(--text-hero)',fontWeight:800,lineHeight:1.04,letterSpacing:'-0.03em',color:'var(--color-text)',margin:0}}>
              Email campaigns that don't stop at the&nbsp;send.
            </h1>

            <p style={{fontSize:'clamp(0.9375rem,2.2vw,1.125rem)',color:'var(--color-muted)',lineHeight:1.65,margin:0,maxWidth:'520px'}}>
              Mailchimp copy + design. Custom landing pages. Live analytics dashboards. Branded reports that prove ROI.
            </p>

            <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'0.35rem 0.75rem',fontSize:'0.6875rem',letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--color-faint)'}}>
              <span>B2B specialist</span>
              <span aria-hidden="true" style={{color:'var(--color-border)'}}>·</span>
              <span>Abu Dhabi-based</span>
              <span aria-hidden="true" style={{color:'var(--color-border)'}}>·</span>
              <span>Global clients</span>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:'0.625rem',fontSize:'0.875rem',fontWeight:500,color:'var(--color-accent)'}}>
              <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#6DAA45',flexShrink:0}} aria-hidden="true"></span>
              Available now — May 2026 start
            </div>

            <div style={{display:'flex',flexWrap:'wrap',gap:'0.875rem',paddingTop:'0.25rem'}}>
              <a href="#work" className="btn-primary">
                See My Work
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </a>
              <a href="#contact" className="btn-ghost">Let's Talk</a>
            </div>

            <div style={{display:'flex',flexWrap:'wrap',gap:'0.5rem',paddingTop:'0.125rem'}}>
              <span className="tag">Mailchimp</span>
              <span className="tag">Analytics</span>
              <span className="tag">Landing Pages</span>
              <span className="tag">Reports</span>
            </div>
          </div>

          <div id="hero-visual" className="reveal" style={{display:'none',width:'100%',maxWidth:'460px',flexShrink:0,position:'relative',height:'420px'}} aria-hidden="true">

            <div style={{position:'absolute',right:0,top:'50%',transform:'translateY(-52%) rotate(-2.5deg)',width:'82%',aspectRatio:'4/3',background:'var(--color-surface)',border:'1px solid var(--color-border)',borderRadius:'12px',boxShadow:'0 28px 56px rgba(0,0,0,0.42)',overflow:'hidden',opacity:0.82}}>
              <div className="browser-chrome-bar">
                <div className="browser-dot"></div><div className="browser-dot"></div><div className="browser-dot"></div>
                <span style={{fontSize:'0.6rem',color:'var(--color-faint)',marginLeft:'8px',letterSpacing:'0.04em'}}>Landing Page Preview</span>
              </div>
              <div style={{padding:'1.25rem',display:'flex',flexDirection:'column',gap:'0.625rem'}}>
                <div style={{width:'65%',height:'18px',background:'rgba(44,40,37,0.75)',borderRadius:'4px'}}></div>
                <div style={{width:'100%',height:'72px',background:'rgba(44,40,37,0.55)',borderRadius:'4px'}}></div>
                <div style={{width:'50%',height:'10px',background:'rgba(44,40,37,0.45)',borderRadius:'4px'}}></div>
                <div style={{width:'38%',height:'30px',background:'rgba(224,122,88,0.18)',border:'1px solid rgba(224,122,88,0.28)',borderRadius:'6px',marginTop:'0.375rem'}}></div>
              </div>
            </div>

            <div style={{position:'absolute',left:0,top:'50%',transform:'translateY(-38%) rotate(3deg)',width:'67%',aspectRatio:'3/4',background:'var(--color-surface)',border:'1px solid var(--color-border)',borderRadius:'12px',boxShadow:'0 36px 72px rgba(0,0,0,0.55)',overflow:'hidden',zIndex:10}}>
              <div className="browser-chrome-bar">
                <div className="browser-dot"></div><div className="browser-dot"></div><div className="browser-dot"></div>
                <span style={{fontSize:'0.6rem',color:'var(--color-faint)',marginLeft:'8px',letterSpacing:'0.04em'}}>Email Preview</span>
              </div>
              <div style={{padding:'0.875rem',display:'flex',flexDirection:'column',gap:'0.5rem',height:'calc(100% - 36px)'}}>
                <div style={{width:'100%',flex:1,maxHeight:'80px',background:'rgba(44,40,37,0.55)',borderRadius:'4px'}}></div>
                <div style={{width:'80%',height:'12px',background:'rgba(44,40,37,0.65)',borderRadius:'3px'}}></div>
                <div style={{width:'100%',height:'7px',background:'rgba(48,43,38,0.45)',borderRadius:'3px'}}></div>
                <div style={{width:'100%',height:'7px',background:'rgba(48,43,38,0.38)',borderRadius:'3px'}}></div>
                <div style={{width:'60%',height:'7px',background:'rgba(48,43,38,0.38)',borderRadius:'3px'}}></div>
                <div style={{width:'100%',height:'34px',background:'rgba(224,122,88,0.16)',border:'1px solid rgba(224,122,88,0.28)',borderRadius:'6px',marginTop:'auto',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{width:'30%',height:'7px',background:'rgba(224,122,88,0.42)',borderRadius:'3px'}}></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  )
}
