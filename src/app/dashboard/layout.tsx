import { getUserProfile } from '@/lib/auth/require-role'
import { redirect } from 'next/navigation'
import { ResponsiveDashboardFrame } from '@/components/dashboard/responsive-dashboard-frame'
import { CompulsoryProfilePhotoUpload } from '@/components/auth/compulsory-profile-photo-upload'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, role } = await getUserProfile()

  // Parents / direct athletes should use /athlete portal
  if (role === 'parent') {
    redirect('/athlete')
  }

  // Coaches & Organizers: Profile photo is compulsory on sign-in
  if (!user.avatar_url) {
    return (
      <CompulsoryProfilePhotoUpload
        userId={user.id}
        fullName={user.full_name || 'Coach'}
        role={role}
        email={user.email || ''}
      />
    )
  }

  const roleLabel = role === 'organizer' ? 'Organizer' : role === 'admin' ? 'Admin' : 'Coach'

  return (
    <ResponsiveDashboardFrame
      role={role}
      roleLabel={roleLabel}
      profileFullName={profile?.full_name ?? null}
      userEmail={user.email || ''}
    >
      {children}
    </ResponsiveDashboardFrame>
  )
}
