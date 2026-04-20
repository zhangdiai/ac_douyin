const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

const resolveApiOrigin = (): string => {
  const explicitTarget = import.meta.env.VITE_API_TARGET as string | undefined
  if (explicitTarget && explicitTarget.trim()) {
    return trimTrailingSlash(explicitTarget.trim())
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const backendPort = (import.meta.env.BACKEND_PORT as string | undefined) || '8000'
    const { protocol, hostname, port } = window.location

    if (port === backendPort) {
      return `${protocol}//${hostname}:${backendPort}`
    }
    return `${protocol}//${hostname}:${backendPort}`
  }

  return ''
}

export const API_ORIGIN = resolveApiOrigin()
export const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api/v1` : '/api/v1'

export const buildApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalizedPath}`
}

export const buildWebSocketUrl = (path: string): string => {
  const wsOrigin = API_ORIGIN.replace(/^http/i, 'ws')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${wsOrigin}${normalizedPath}`
}
