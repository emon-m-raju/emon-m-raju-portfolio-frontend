import { useEffect, useState } from 'react'

const storageKey = 'portfolio-theme'

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem(storageKey)
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme
    }
  } catch {
    // Theme selection still works when browser storage is unavailable.
  }

  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme

    try {
      window.localStorage.setItem(storageKey, theme)
    } catch {
      // Keep the selected theme for this session when browser storage is unavailable.
    }
  }, [theme])

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
