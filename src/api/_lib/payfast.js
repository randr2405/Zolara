import crypto from 'node:crypto'
import dns from 'node:dns/promises'

export const SANDBOX = process.env.PAYFAST_SANDBOX === 'true'
export const HOST = SANDBOX ? 'https://sandbox.payfast.co.za' : 'https://www.payfast.co.za'
export const PROCESS_URL = `${HOST}/eng/process`
export const VALIDATE_URL = `${HOST}/eng/query/validate`

const HOSTS = ['www.payfast.co.za', 'sandbox.payfast.co.za', 'w1w.payfast.co.za', 'w2w.payfast.co.za']

export function encode(value) {
  return encodeURIComponent(String(value))
    .replace(/%20/g, '+')
    .replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

export function paramString(entries) {
  return entries.map(([k, v]) => `${k}=${encode(v)}`).join('&')
}

export function withPassphrase(base) {
  const passphrase = (process.env.PAYFAST_PASSPHRASE || '').trim()
  return passphrase ? `${base}&passphrase=${encode(passphrase)}` : base
}

export function sign(text) {
  return crypto.createHash('md5').update(text).digest('hex')
}

export async function isPayFastIp(rawIp) {
  const ip = String(rawIp || '').replace(/^::ffff:/, '')
  const lists = await Promise.all(
    HOSTS.map((h) => dns.lookup(h, { all: true, family: 4 }).catch(() => []))
  )
  return lists.flat().some((r) => r.address === ip)
}

export async function validateWithPayFast(base) {
  const res = await fetch(VALIDATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: base,
  })
  return (await res.text()).trim() === 'VALID'
}