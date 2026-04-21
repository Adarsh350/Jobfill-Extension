export default function Footer() {
  return (
    <footer style={{background:'var(--color-footer)',borderTop:'1px solid var(--color-border)',padding:'2rem 0'}}>
      <div className="container-shell">
        <div id="footer-row" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'1.125rem',textAlign:'center'}}>

          <p style={{fontSize:'0.875rem',color:'var(--color-muted)',margin:0}}>
            <span style={{fontWeight:600,color:'var(--color-text)'}}>Adarsh Shankar</span>
            <span style={{color:'var(--color-faint)',margin:'0 0.5rem'}} aria-hidden="true">—</span>
            B2B Email · Abu Dhabi
          </p>

          <nav aria-label="Footer navigation" style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'1.5rem'}}>
            <a href="#work"     className="footer-link">Work</a>
            <a href="#packages" className="footer-link">Packages</a>
            <a href="#proof"    className="footer-link">Proof</a>
            <a href="#contact"  className="footer-link">Contact</a>
          </nav>

          <p style={{fontSize:'0.75rem',color:'var(--color-faint)',margin:0}}>© 2026 Adarsh Shankar</p>

        </div>
      </div>
    </footer>
  )
}
