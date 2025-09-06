export function AppVersion() {
  // Get version from package.json - injected at build time
  const version = __APP_VERSION__

  return (
    <span className="text-xs font-mono text-white/50 hover:text-white/70 transition-colors self-end">
      v{version}
    </span>
  )
}