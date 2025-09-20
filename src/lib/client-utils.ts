export function decodePassphrase(passphrase: string) {
  const encodedPassphrase = encodeURIComponent(passphrase);
  const bytes = encodedPassphrase
    .split('')
    .map((c) => c.charCodeAt(0));
  return new Uint8Array(bytes);
}

export function encodePassphrase(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('');
}