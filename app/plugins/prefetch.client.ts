/**
 * Hover/focus/touch intent prefetch for leaderboard, profile and repository links.
 * Leaderboards are precomputed (cheap), so they load on first hover; profiles and repos may
 * hit GitHub, so they wait for a short hover to avoid fetching every row the pointer crosses.
 */
export default defineNuxtPlugin(() => {
  let timer: ReturnType<typeof setTimeout> | undefined

  function target(event: Event) {
    const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!link || link.origin !== window.location.origin) return null
    const rank = link.pathname.match(/^\/rank\/([a-z-]+)\/?$/)
    if (rank) return { key: leaderboardKey(rank[1]!), url: `/api/leaderboard/${rank[1]}`, delay: 0 }
    const user = link.pathname.match(/^\/u\/([\w-]+)\/?$/)
    if (user) return { key: profileKey(user[1]!), url: `/api/users/${user[1]}`, delay: 120 }
    const repo = link.pathname.match(/^\/repos\/([\w.-]+)\/([\w.-]+)\/?$/)
    if (repo) {
      const full = `${repo[1]}/${repo[2]}`
      return { key: repoKey(full), url: `/api/repos/${full}`, delay: 120 }
    }
    return null
  }

  function intent(event: Event) {
    const hit = target(event)
    clearTimeout(timer)
    if (!hit) return
    const delay = event.type === 'pointerover' ? hit.delay : 0
    timer = setTimeout(() => loadClientData(hit.key, hit.url).catch(() => {}), delay)
  }

  document.addEventListener('pointerover', intent, { passive: true })
  document.addEventListener('focusin', intent, { passive: true })
  document.addEventListener('touchstart', intent, { passive: true })
})
