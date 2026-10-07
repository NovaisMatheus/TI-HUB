export function hubOrigin(value) {
  const url = new URL(value);
  const parts = url.hostname.split('.').map(Number);
  const privateIpv4 =
    parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
    (parts[0] === 10 ||
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31));
  if (
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        (['localhost', '127.0.0.1'].includes(url.hostname) || privateIpv4)
      ))
  )
    throw new Error('Use HTTPS, localhost ou um IPv4 privado da rede local do Hub.');
  return url.origin;
}
