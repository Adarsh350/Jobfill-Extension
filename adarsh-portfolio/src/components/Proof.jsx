import { useEffect, useRef } from 'react'

export default function Proof() {
  const videoRef = useRef(null)
  const sectionRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    const section = sectionRef.current
    if (!video || !section) return

    // Play when visible, pause when scrolled away
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.15 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="proof" ref={sectionRef} style={{borderTop:'1px solid var(--color-border)'}}>
      <div className="container-shell section-pad">

        <div className="reveal" style={{marginBottom:'2rem',textAlign:'center'}}>
          <p className="section-label" style={{marginBottom:'0.5rem'}}>Proof</p>
          <p style={{fontSize:'clamp(0.9375rem,2vw,1.0625rem)',color:'var(--color-muted)',maxWidth:'580px',margin:'0 auto',lineHeight:1.65}}>
            A live campaign analytics dashboard — tracking email opens, landing page visits, and lead conversions in real time.
          </p>
        </div>

        <div className="reveal" style={{maxWidth:'880px',margin:'0 auto 1.5rem'}}>
          <div className="browser-chrome" style={{boxShadow:'var(--shadow-video)'}}>
            <div className="browser-chrome-bar">
              <div className="browser-dot"></div><div className="browser-dot"></div><div className="browser-dot"></div>
              <span style={{fontSize:'0.6875rem',color:'var(--color-faint)',marginLeft:'10px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>Campaign Analytics Dashboard — Live</span>
            </div>
            <div style={{position:'relative',background:'#0F0D0B',aspectRatio:'16/9',overflow:'hidden'}}>
              <video ref={videoRef}
                src="/assets/video/dashboard.mp4"
                preload="none" muted loop playsInline
                poster="/assets/video/dashboard-poster.jpg"
                aria-label="Campaign analytics dashboard demo — email opens, landing page visits, and lead conversions"
                style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}>
              </video>
            </div>
          </div>
        </div>

        <p className="reveal" style={{textAlign:'center',fontSize:'0.875rem',color:'var(--color-muted)',marginBottom:'4rem'}}>
          Email opens → landing page visits → lead conversions. Real time. No exports.
        </p>

        <div className="reveal">
          <h3 style={{fontSize:'var(--text-h3)',fontWeight:700,color:'var(--color-text)',margin:'0 0 0.375rem',textAlign:'center'}}>Campaign Reports</h3>
          <p style={{fontSize:'0.875rem',color:'var(--color-muted)',textAlign:'center',margin:'0 0 2rem'}}>Built for boardrooms, not filing cabinets.</p>

          <div id="reports-grid" style={{display:'grid',gridTemplateColumns:'1fr',gap:'1.25rem',maxWidth:'860px',margin:'0 auto'}}>

            <div className="report-paper">
              <div className="report-paper-header">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                  <span style={{fontSize:'0.6875rem',letterSpacing:'0.08em',textTransform:'uppercase',color:'#8C7A70',fontWeight:700}}>Campaign Report</span>
                  <span style={{fontSize:'0.6875rem',color:'#B0A090'}}>Q1 2026</span>
                </div>
                <div style={{height:'2px',width:'100%',background:'rgba(0,0,0,0.08)',borderRadius:'1px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:'72%',background:'#E07A58',borderRadius:'1px'}}></div>
                </div>
              </div>
              <div style={{padding:'1.25rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                <div style={{height:'10px',width:'80%',background:'rgba(0,0,0,0.1)',borderRadius:'3px'}}></div>
                <div style={{height:'64px',background:'rgba(0,0,0,0.07)',borderRadius:'5px'}}></div>
                <div style={{display:'flex',gap:'0.625rem'}}>
                  <div style={{height:'8px',width:'38%',background:'rgba(0,0,0,0.08)',borderRadius:'3px'}}></div>
                  <div style={{height:'8px',width:'28%',background:'rgba(224,122,88,0.25)',borderRadius:'3px'}}></div>
                </div>
                <p style={{fontSize:'0.6875rem',color:'#9C8A7A',textAlign:'center',margin:0,paddingTop:'0.25rem'}}>Campaign Report — Page 1</p>
              </div>
            </div>

            <div className="report-paper">
              <div className="report-paper-header">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                  <span style={{fontSize:'0.6875rem',letterSpacing:'0.08em',textTransform:'uppercase',color:'#8C7A70',fontWeight:700}}>Campaign Report</span>
                  <span style={{fontSize:'0.6875rem',color:'#B0A090'}}>Q1 2026</span>
                </div>
                <div style={{height:'2px',width:'100%',background:'rgba(0,0,0,0.08)',borderRadius:'1px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:'48%',background:'#E07A58',borderRadius:'1px'}}></div>
                </div>
              </div>
              <div style={{padding:'1.25rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                <div style={{height:'10px',width:'60%',background:'rgba(0,0,0,0.1)',borderRadius:'3px'}}></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.625rem'}}>
                  <div style={{height:'52px',background:'rgba(0,0,0,0.07)',borderRadius:'5px'}}></div>
                  <div style={{height:'52px',background:'rgba(0,0,0,0.07)',borderRadius:'5px'}}></div>
                </div>
                <div style={{height:'8px',width:'70%',background:'rgba(0,0,0,0.08)',borderRadius:'3px'}}></div>
                <p style={{fontSize:'0.6875rem',color:'#9C8A7A',textAlign:'center',margin:0,paddingTop:'0.25rem'}}>Campaign Report — Page 2</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  )
}
