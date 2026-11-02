// POST /functions/v1/delete-account – deletes the caller's whole account:
// first every photo under child-photos/<uid>/, then the auth user (all family
// rows cascade, 0018_accounts.sql). Body: { "confirm": "DELETE" }.
// Logic: ../_shared/deleteAccount.ts. The service-role key comes from the
// Edge Function environment and never leaves the server.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import {
  type DeleteAccountDeps,
  handleDeleteAccount,
  PHOTO_BUCKET,
} from '../_shared/deleteAccount.ts'

const env = (name: string) => Deno.env.get(name)

function required(name: string): string {
  const value = env(name)
  if (!value) throw new Error(`missing env ${name}`)
  return value
}

const url = required('SUPABASE_URL')
const anonKey = required('SUPABASE_ANON_KEY')
const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY')
const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}
const admin = createClient(url, serviceKey, options)

/** One page of Storage's list(); a folder has more only past this many entries. */
const PAGE = 100

const deps: DeleteAccountDeps = {
  env,
  async userIdFromToken(token: string) {
    const userClient = createClient(url, anonKey, {
      ...options,
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data, error } = await userClient.auth.getUser(token)
    if (error || !data.user) return null
    return data.user.id
  },
  async listPhotos(userId: string) {
    const out: string[] = []
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await admin.storage
        .from(PHOTO_BUCKET)
        .list(userId, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw new Error(`list: ${error.message}`)
      const page = data ?? []
      // Entries without an id are sub-folders (the policies never let a client make one).
      for (const item of page) if (item.id) out.push(`${userId}/${item.name}`)
      if (page.length < PAGE) return out
    }
  },
  async removePhotos(paths: string[]) {
    const { error } = await admin.storage.from(PHOTO_BUCKET).remove(paths)
    if (error) throw new Error(`remove: ${error.message}`)
  },
  async deleteUser(userId: string) {
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) throw new Error(`deleteUser: ${error.message}`)
  },
  log(message: string, error?: unknown) {
    // Messages only; never tokens, e-mail addresses or request bodies.
    console.error(message, error instanceof Error ? error.message : String(error))
  },
}

Deno.serve((request) => handleDeleteAccount(request, deps))
