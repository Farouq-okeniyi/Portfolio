import './style.css'
import { startHero, webglAvailable } from './world/hero-scene'
import { LAYERS } from './world/layers'
import { launchCvRocket } from './world/cv-rocket'
import { launchToExternalPage } from './world/warp-launch'

// Manual scroll restoration so refresh always starts at orbit/surface
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}
window.scrollTo(0, 0)

const canvas = document.getElementById('world') as HTMLCanvasElement
const depthLabel = document.getElementById('gauge-depth') as HTMLElement
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.gauge-list a'))
const replayBtn = document.getElementById('replay-btn') as HTMLButtonElement | null
const skipBtn = document.getElementById('skip-btn') as HTMLButtonElement | null

/** Marks the layer nearest the middle of the screen as current. */
function trackActiveLayer() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        for (const a of links) {
          if (a.dataset.layer === e.target.id) a.setAttribute('aria-current', 'true')
          else a.removeAttribute('aria-current')
        }
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  )
  for (const l of LAYERS) {
    const el = document.getElementById(l.id)
    if (el) io.observe(el)
  }
}
trackActiveLayer()

function runMissionLoader(onComplete: () => void) {
  const loader = document.getElementById('mission-loader')
  const bar = document.getElementById('loader-bar')
  const pct = document.getElementById('loader-percent')
  const status = document.getElementById('loader-status')
  if (!loader || !bar || !pct || !status) {
    onComplete()
    return
  }

  let progress = 0
  let isDone = false
  const steps = [
    { p: 25, msg: 'ESTABLISHING ION DOWNLINK...' },
    { p: 55, msg: 'SYNTHESIZING VOXEL STRATA & 16PX ATLAS...' },
    { p: 85, msg: 'PRESSURIZING POD & RIGGING ROBOT...' },
    { p: 100, msg: 'LAUNCH CLEARED. ENTERING ORBIT...' },
  ]
  let currentStep = 0

  const finish = () => {
    if (isDone) return
    isDone = true
    clearInterval(interval)
    bar.style.width = '100%'
    pct.textContent = '100%'
    status.textContent = 'LAUNCH CLEARED. ENTERING ORBIT...'
    setTimeout(() => {
      loader.classList.add('loaded')
      setTimeout(() => loader.remove(), 400)
      onComplete()
    }, 300)
  }

  // Click or keypress skips the boot screen immediately
  loader.addEventListener('click', finish)

  const interval = setInterval(() => {
    if (currentStep < steps.length) {
      const targetP = steps[currentStep].p
      progress += 4
      if (progress >= targetP) {
        status.textContent = steps[currentStep].msg
        currentStep++
      }
      bar.style.width = `${Math.min(100, progress)}%`
      pct.textContent = `${Math.min(100, progress)}%`
    } else {
      finish()
    }
  }, 50)
}

if (!webglAvailable()) {
  document.documentElement.classList.add('no-webgl')
  const loader = document.getElementById('mission-loader')
  if (loader) loader.remove()
} else {
  const root = document.documentElement
  root.classList.add('intro')

  const hero = startHero(canvas, () => {
    root.classList.remove('intro')
  })

  // Run the mission loader on startup / refresh
  runMissionLoader(() => {
    // Mission loader complete - start descent intro sequence
    hero.playIntro()
  })

  // Skip button click
  skipBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    hero.skip()
  })

  // Spacebar or Escape to skip intro
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === 'Escape') {
      hero.skip()
    }
  })

  // Replay Mission button
  replayBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    hero.replay()
  })

  // Clicking gauge links skips intro and navigates smoothly
  links.forEach((link) => {
    link.addEventListener('click', () => {
      hero.skip()
    })
  })

  // Depth readout on the gauge, in metres.
  function readout() {
    requestAnimationFrame(readout)
    depthLabel.textContent = `Depth ${Math.round(-hero.getDepth())} m`
  }
  readout()
  window.addEventListener('load', () => hero.remeasure())

  // Ore Card Mining / Inspection Modal logic
  const modal = document.getElementById('project-modal') as HTMLDialogElement | null
  const modalTitle = document.getElementById('modal-title')
  const modalDesc = document.getElementById('modal-desc')
  const modalBadge = document.getElementById('modal-badge')
  const modalTags = document.getElementById('modal-tags')
  const modalLink = document.getElementById('modal-link') as HTMLAnchorElement | null
  const modalClose = document.getElementById('modal-close')
  const modalDismiss = document.getElementById('modal-dismiss')

  const projectsData: Record<string, { title: string; badge: string; desc: string; tags: string[]; link: string }> = {
    booktalk: {
      title: 'BookTalk',
      badge: '◆ Amber Ore Specimen',
      desc: 'A full-stack social reading platform designed for synchronized book discussions, chapter notes sharing, and community reader circles.',
      tags: ['React', 'Node.js', 'PostgreSQL', 'Socket.io', 'Docker'],
      link: 'https://github.com/Farouq-okeniyi',
    },
    mailextract: {
      title: 'MailExtract',
      badge: '◆ Ion Crystal Specimen',
      desc: 'Subterranean transaction parsing pipeline that authenticates via OAuth2 to extract banking settlement notifications into structured ledger data.',
      tags: ['TypeScript', 'NestJS', 'OAuth2', 'PostgreSQL', 'Redis'],
      link: 'https://github.com/Farouq-okeniyi',
    },
    streetfootball: {
      title: 'Street Football Fantasy',
      badge: '◆ Amber Ore Specimen',
      desc: 'Fantasy league management engine engineered from grassroots community football matches with dynamic stat calculation and instant ranking.',
      tags: ['React', 'Spring Boot', 'Redis', 'PostgreSQL'],
      link: 'https://github.com/Farouq-okeniyi',
    },
    ssf: {
      title: 'Solution Selection Framework',
      badge: '◆ Rare Bedrock Specimen',
      desc: 'Comprehensive multi-criteria decision matrix framework designed for evaluating enterprise architectures and cloud services objectively.',
      tags: ['.NET Core', 'React', 'Azure', 'CosmosDB'],
      link: 'https://github.com/Farouq-okeniyi',
    },
  }

  document.querySelectorAll<HTMLElement>('.ore-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      e.stopPropagation()
      const key = card.dataset.ore
      if (!key || !modal || !projectsData[key]) return
      const p = projectsData[key]
      if (modalTitle) modalTitle.textContent = p.title
      if (modalBadge) modalBadge.textContent = p.badge
      if (modalDesc) modalDesc.textContent = p.desc
      if (modalTags) {
        modalTags.innerHTML = p.tags.map((t) => `<span>${t}</span>`).join('')
      }
      if (modalLink) {
        modalLink.href = p.link
        modalLink.textContent = `Inspect Repository (${p.title}) ↗`
      }
      modal.showModal()
    })
  })

  modalClose?.addEventListener('click', () => modal?.close())
  modalDismiss?.addEventListener('click', () => modal?.close())
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close()
  })

  // Core Planetary Beacon Transmission logic
  const beaconSend = document.getElementById('beacon-send') as HTMLAnchorElement | null
  const beaconCopy = document.getElementById('beacon-copy') as HTMLButtonElement | null
  const beaconToast = document.getElementById('beacon-toast') as HTMLElement | null
  const emailAddress = 'farouqokeniyi2004@gmail.com'

  function triggerBeaconToast(message: string) {
    if (!beaconToast) return
    beaconToast.textContent = message
    beaconToast.hidden = false
    setTimeout(() => {
      if (beaconToast) beaconToast.hidden = true
    }, 4500)
  }

  beaconSend?.addEventListener('click', () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(emailAddress).catch(() => {})
    }
    triggerBeaconToast(`⚡ Transmission launched! Signal address copied: ${emailAddress}`)
  })

  beaconCopy?.addEventListener('click', () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(emailAddress).then(() => {
        triggerBeaconToast(`✓ Signal address copied to clipboard: ${emailAddress}`)
        if (beaconCopy) {
          const orig = beaconCopy.textContent
          beaconCopy.textContent = '✓ Copied to Clipboard!'
          setTimeout(() => {
            if (beaconCopy) beaconCopy.textContent = orig
          }, 2000)
        }
      }).catch(() => {
        triggerBeaconToast(`Signal Address: ${emailAddress}`)
      })
    } else {
      triggerBeaconToast(`Signal Address: ${emailAddress}`)
    }
  })

  // CV Cargo Rocket Launch Animation on click
  const cvButtons = Array.from(document.querySelectorAll<HTMLAnchorElement>('#cv-link, a[href*="Farouq_Okeniyi_CV.pdf"], a[download]'))
  cvButtons.forEach((cvLink) => {
    cvLink.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      launchCvRocket(cvLink, cvLink.getAttribute('href') || '/Farouq_Okeniyi_CV.pdf')
    })
  })

  // Hyperspace / Warp Launch animation for external page transitions
  document.querySelectorAll<HTMLAnchorElement>('a[href^="http"], a[target="_blank"]').forEach((extLink) => {
    extLink.addEventListener('click', (e) => {
      const url = extLink.href
      if (!url || url.includes('#') || url.includes('Farouq_Okeniyi_CV')) return
      e.preventDefault()
      e.stopPropagation()

      let dest = 'EXTERNAL SPACE'
      if (url.includes('github.com')) dest = 'GITHUB // @Farouq-okeniyi'
      else if (url.includes('linkedin.com')) dest = 'LINKEDIN // Farouq Okeniyi'
      else if (url.includes('mail.google.com')) dest = 'WEB GMAIL // Transmission'
      else dest = extLink.textContent?.replace('↗', '').trim() || 'EXTERNAL SECTOR'

      launchToExternalPage(url, dest)
    })
  })
}
