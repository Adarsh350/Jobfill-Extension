import { useEffect } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Work from './components/Work'
import Packages from './components/Packages'
import Proof from './components/Proof'
import Testimonials from './components/Testimonials'
import Contact from './components/Contact'
import Footer from './components/Footer'

export default function App() {
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = document.querySelectorAll('.reveal')
    if (reduceMotion) { els.forEach(el => el.classList.add('visible')); return }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target) }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const sections = document.querySelectorAll('section[id], header[id]')
    const links = document.querySelectorAll('.nav-link[data-spy]')
    if (!sections.length || !links.length) return
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id
          links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`))
        }
      })
    }, { threshold: 0.35 })
    sections.forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      const anchor = e.target.closest('a[href^="#"]')
      if (!anchor) return
      const target = document.querySelector(anchor.getAttribute('href'))
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }) }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <>
      <a href="#hero" className="sr-only focus-show">Skip to content</a>
      <Nav />
      <Hero />
      <Work />
      <Packages />
      <Proof />
      <Testimonials />
      <Contact />
      <Footer />
    </>
  )
}
