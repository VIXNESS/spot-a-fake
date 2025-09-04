export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Auth-specific layout - no navigation, centered forms */}
      <div className="flex items-center justify-center min-h-screen">
        {children}
      </div>
    </div>
  )
}
