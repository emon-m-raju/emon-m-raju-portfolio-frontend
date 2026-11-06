import { createContext, useContext } from 'react'

export const OwnerAuthContext = createContext(null)

export function useOwnerAuth() {
  const context = useContext(OwnerAuthContext)
  if (!context) {
    throw new Error('useOwnerAuth must be used within OwnerAuthContext.')
  }
  return context
}
