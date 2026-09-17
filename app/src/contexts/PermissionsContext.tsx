import { createContext, useContext } from 'react'
import { useSessionStore } from '@/store/session'
import type { Capabilities } from '@/lib/roles'

interface PermissionsContextValue {
  capabilities: Capabilities
  can: (action: keyof Capabilities) => boolean
}

const PermissionsContext = createContext<PermissionsContextValue>({
  capabilities: {
    canCreateRequest: false, canSubmitRequest: false, canPriceResponse: false,
    canPriceFat: false, canPriceRam: false, canPriceGreen: false,
    canApproveTemplates: false, canReviewDataValidation: false, isAdmin: false,
  },
  can: () => false,
})

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const role = useSessionStore((s) => s.role)
  const capabilities = role().capabilities

  const value: PermissionsContextValue = {
    capabilities,
    can: (action) => !!capabilities[action],
  }

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  return useContext(PermissionsContext)
}

export function PermissionGate({ action, children }: { action: keyof Capabilities; children: React.ReactNode }) {
  const { can } = usePermissions()
  return can(action) ? <>{children}</> : null
}
