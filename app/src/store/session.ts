import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type RoleId, getRole } from '@/lib/roles'

interface SessionUser {
  name: string
  initials: string
  email: string
}

const USERS_BY_ROLE: Record<RoleId, SessionUser> = {
  'contract-originator': { name: 'Aditya Agarwal', initials: 'AA', email: 'aditya.agarwal@centrica.com' },
  'fat-analyst': { name: 'Anna Nowak', initials: 'AN', email: 'anna.nowak@centrica.com' },
  'ram-analyst': { name: 'Rob Meyer', initials: 'RM', email: 'rob.meyer@centrica.com' },
  'green-analyst': { name: 'Greta Lindqvist', initials: 'GL', email: 'greta.lindqvist@centrica.com' },
  'desk-lead': { name: 'Priya Shah', initials: 'PS', email: 'priya.shah@centrica.com' },
  'dv-reviewer': { name: 'Jonas Weber', initials: 'JW', email: 'jonas.weber@centrica.com' },
  admin: { name: 'Rajesh Kurikayar', initials: 'RK', email: 'rajesh.kurikayar@centrica.com' },
}

interface SessionState {
  roleId: RoleId
  setRoleId: (roleId: RoleId) => void
  user: () => SessionUser
  role: () => ReturnType<typeof getRole>
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      roleId: 'contract-originator',
      setRoleId: (roleId) => set({ roleId }),
      user: () => USERS_BY_ROLE[get().roleId],
      role: () => getRole(get().roleId),
    }),
    { name: 'orca.session' },
  ),
)
