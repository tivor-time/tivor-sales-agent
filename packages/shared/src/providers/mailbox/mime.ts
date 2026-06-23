/**
 * Pure RFC822 / MIME builder for outbound mail. No node-only imports except
 * Buffer (base64). Used by the Gmail adapter (which uploads a raw MIME message)
 * and unit-tested directly. Emits compliance + threading headers.
 */

/** RFC2047-encode a header value if it contains non-ASCII characters. */
export function encodeHeaderWord(s: string): string {
  const isAscii = [...s].every((c) => c.charCodeAt(0) < 128)
  return isAscii ? s : `=?utf-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`
}

export interface MimeInput {
  from: string
  to: string
  subject: string
  text: string
  html?: string
  inReplyTo?: string
  references?: string[]
  /** A pre-generated Message-ID, e.g. "<uuid@domain>". */
  messageId: string
  /** A List-Unsubscribe header value, e.g. "<https://app/u/abc>, <mailto:u@app>". */
  listUnsubscribe?: string
}

/** Build a complete RFC822 message string (CRLF line endings). */
export function buildMime(i: MimeInput): string {
  const headers: string[] = [
    `From: ${i.from}`,
    `To: ${i.to}`,
    `Subject: ${encodeHeaderWord(i.subject)}`,
    `Message-ID: ${i.messageId}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
  ]
  if (i.inReplyTo) headers.push(`In-Reply-To: ${i.inReplyTo}`)
  if (i.references?.length) headers.push(`References: ${i.references.join(' ')}`)
  if (i.listUnsubscribe) {
    headers.push(`List-Unsubscribe: ${i.listUnsubscribe}`)
    headers.push('List-Unsubscribe-Post: List-Unsubscribe=One-Click')
  }

  if (i.html) {
    const boundary = `=_tp_${Buffer.from(i.messageId, 'utf8').toString('hex').slice(0, 24)}`
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
    const body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(i.text, 'utf8').toString('base64'),
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(i.html, 'utf8').toString('base64'),
      `--${boundary}--`,
      '',
    ]
    return `${headers.join('\r\n')}\r\n\r\n${body.join('\r\n')}`
  }

  headers.push('Content-Type: text/plain; charset=utf-8')
  headers.push('Content-Transfer-Encoding: base64')
  return `${headers.join('\r\n')}\r\n\r\n${Buffer.from(i.text, 'utf8').toString('base64')}`
}
