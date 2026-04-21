import { useState } from 'react'

export default function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <nav aria-label="Main navigation" id="main-nav"
      style={{position:'fixed',top:0,width:'100%',zIndex:50,background:'rgba(20,18,16,0.92)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',borderBottom:'1px solid rgba(48,43,38,0.6)',height:'var(--nav-h-mobile)'}}>
      <div className="container-shell" style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'space-between'}}>

        <a href="#hero" style={{color:'var(--color-accent)',fontSize:'0.875rem',fontWeight:600,letterSpacing:'-0.01em'}} aria-label="Adarsh Shankar home">
          Adarsh Shankar
        </a>

        <div id="nav-links" style={{display:'none',alignItems:'center',gap:'2rem'}}>
          <a href="#work"     className="nav-link" data-spy="" style={{fontSize:'0.875rem',fontWeight:500,color:'var(--color-muted)',paddingBottom:'2px',transition:'color 180ms'}}>Work</a>
          <a href="#packages" className="nav-link" data-spy="" style={{fontSize:'0.875rem',fontWeight:500,color:'var(--color-muted)',paddingBottom:'2px',transition:'color 180ms'}}>Packages</a>
          <a href="#proof"    className="nav-link" data-spy="" style={{fontSize:'0.875rem',fontWeight:500,color:'var(--color-muted)',paddingBottom:'2px',transition:'color 180ms'}}>Proof</a>
          <a href="#contact"  className="btn-primary" style={{padding:'0.55rem 1.1rem',fontSize:'0.8125rem'}}>Let's Talk</a>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label="Toggle navigation menu"
          id="hamburger"
          style={{display:'flex',flexDirection:'column',gap:'5px',background:'none',border:'none',padding:'10px',cursor:'pointer',minWidth:'44px',minHeight:'44px',alignItems:'center',justifyContent:'center'}}>
          <span style={{display:'block',width:'22px',height:'2px',background:'var(--color-text)',borderRadius:'1px',transition:'transform 220ms ease,opacity 220ms ease',transform:open?'translateY(7px) rotate(45deg)':''}}></span>
          <span style={{display:'block',width:'22px',height:'2px',background:'var(--color-text)',borderRadius:'1px',transition:'opacity 220ms ease',opacity:open?0:1}}></span>
          <span style={{display:'block',width:'22px',height:'2px',background:'var(--color-text)',borderRadius:'1px',transition:'transform 220ms ease,opacity 220ms ease',transform:open?'translateY(-7px) rotate(-45deg)':''}}></span>
        </button>
      </div>

      {open && (
        <div id="mobile-menu"
          style={{position:'fixed',top:'var(--nav-h-mobile)',left:0,right:0,bottom:0,background:'rgba(20,18,16,0.97)',backdropFilter:'blur(16px)',zIndex:60,display:'flex',flexDirection:'column',padding:'1.25rem 1.5rem'}}>
          <a href="#work"     onClick={() => setOpen(false)} style={{display:'block',padding:'1.1rem 0.5rem',fontSize:'1.2rem',fontWeight:600,color:'var(--color-text)',borderBottom:'1px solid var(--color-border)'}}>Work</a>
          <a href="#packages" onClick={() => setOpen(false)} style={{display:'block',padding:'1.1rem 0.5rem',fontSize:'1.2rem',fontWeight:600,color:'var(--color-text)',borderBottom:'1px solid var(--color-border)'}}>Packages</a>
          <a href="#proof"    onClick={() => setOpen(false)} style={{display:'block',padding:'1.1rem 0.5rem',fontSize:'1.2rem',fontWeight:600,color:'var(--color-text)',borderBottom:'1px solid var(--color-border)'}}>Proof</a>
          <a href="#contact"  onClick={() => setOpen(false)} style={{display:'block',padding:'1.1rem 0.5rem',fontSize:'1.2rem',fontWeight:600,color:'var(--color-text)',borderBottom:'1px solid var(--color-border)'}}>Contact</a>
          <div style={{padding:'1.5rem 0.5rem 0'}}>
            <a href="#contact" onClick={() => setOpen(false)} className="btn-primary" style={{display:'flex',width:'100%',justifyContent:'center'}}>Let's Talk</a>
          </div>
        </div>
      )}
    </nav>
  )
}
