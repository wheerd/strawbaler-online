/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OEKOBAUDAT_API_URL?: string
  readonly VITE_SKETCHUP_API_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
