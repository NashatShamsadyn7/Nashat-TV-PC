import { session } from 'electron'

// Curated blocklist of ad/tracker/popup domains commonly used by free streaming
// embed sites (vidsrc, embed.su, 2embed, autoembed, multiembed, etc.).
// Matching is suffix-based: any hostname that equals or ends with `.<entry>`
// is blocked.
const BLOCKED_DOMAINS = new Set<string>([
  // Major ad networks
  'doubleclick.net',
  'googlesyndication.com',
  'googletagservices.com',
  'googletagmanager.com',
  'google-analytics.com',
  'googleadservices.com',
  'adservice.google.com',
  'adnxs.com',
  'adsystem.com',
  'amazon-adsystem.com',
  'adsafeprotected.com',
  'moatads.com',
  'scorecardresearch.com',
  'quantserve.com',
  'outbrain.com',
  'taboola.com',
  'criteo.com',
  'criteo.net',
  'rubiconproject.com',
  'openx.net',
  'pubmatic.com',
  'casalemedia.com',
  'mediavine.com',
  'media.net',
  'yieldmo.com',
  'indexexchange.com',
  'smartadserver.com',
  'spotxchange.com',
  'spotx.tv',
  'innovid.com',
  'teads.tv',
  'adform.net',
  'bidswitch.net',
  'rlcdn.com',
  'rfihub.com',
  'rfihub.net',
  'agkn.com',
  '3lift.com',
  'sharethrough.com',
  'contextweb.com',
  'tribalfusion.com',
  'exoclick.com',
  'exosrv.com',
  'realsrv.com',
  'a-ads.com',
  'adsterra.com',
  'adskeeper.com',
  'propellerads.com',
  'propeller-tracking.com',
  'onclickads.net',
  'onclkds.com',
  'popads.net',
  'popcash.net',
  'popmyads.com',
  'mgid.com',
  'revcontent.com',
  'plista.com',
  'zedo.com',
  'adcash.com',
  'juicyads.com',
  'trafficjunky.net',
  'trafficjunky.com',
  'ero-advertising.com',
  'trafficstars.com',
  'tsyndicate.com',
  'clickadu.com',
  'hilltopads.net',
  'ad-maven.com',
  'admaven.pro',
  'galaksion.com',
  'datsearch.com',
  'rumble.com',
  'partner-pub-',
  // Common embed-site ad/redirect domains
  'protectsubrate.com',
  'undirected-glamoured.com',
  'orgriddle.com',
  'pushwhy.com',
  'pushmix.com',
  'pushvideo.net',
  'pushtimer.net',
  'pushsmart.app',
  'notice-rev.com',
  'arrivablyflowing.com',
  'rcdcdn.com',
  'verdantgangly.com',
  'foreverbestpush.com',
  'preferentialcontainer.com',
  'arnitcamr.net',
  'taupinated.com',
  'tagsrvcs.com',
  'gemama.com',
  'profitableratecpm.com',
  'highperformancecdn.com',
  'highperformanceformat.com',
  // Trackers
  'hotjar.com',
  'mixpanel.com',
  'amplitude.com',
  'segment.io',
  'segment.com',
  'fullstory.com',
  'mouseflow.com',
  'inspectlet.com',
  'crazyegg.com',
  'optimizely.com',
  'kissmetrics.com',
  'newrelic.com',
  'nr-data.net',
  'bugsnag.com',
  'sentry.io',
  'rollbar.com',
  'branch.io',
  'appsflyer.com',
  'adjust.com',
  'kochava.com',
  'tapjoyads.com',
  'flurry.com',
  'mparticle.com',
  'rudderlabs.com',
  'snowplowanalytics.com'
])

// URL-path patterns commonly used by ads/popups even on non-blocklisted hosts.
const BLOCKED_URL_PATTERNS: RegExp[] = [
  /\/(ads|adserver|adsense|adframe|adcontent|advertisement|pop(up|under)?|prebid|analytics|tracker|telemetry)(\/|\.|\?|$)/i,
  /\bgoogle_ads_iframe\b/i,
  /\/gtm\.js/i,
  /\/gtag\/js/i
]

function hostBlocked(hostname: string): boolean {
  const h = hostname.toLowerCase()
  for (const entry of BLOCKED_DOMAINS) {
    if (h === entry) return true
    if (h.endsWith('.' + entry)) return true
    if (entry.endsWith('-') && h.startsWith(entry)) return true
  }
  return false
}

export function shouldBlockUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (hostBlocked(u.hostname)) return true
    const full = u.pathname + u.search
    return BLOCKED_URL_PATTERNS.some((re) => re.test(full))
  } catch {
    return false
  }
}

export function installAdblock(): void {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (shouldBlockUrl(details.url)) {
      callback({ cancel: true })
      return
    }
    callback({})
  })
}
