/** Supply Cloudflare-compatible D1 and R2 bindings from your hosting adapter. */
export function getPlatform(): { DB: any; BUCKET: any } {
  throw new Error('Configure verified authentication, D1 and R2 hosting adapters before using the API.');
}
