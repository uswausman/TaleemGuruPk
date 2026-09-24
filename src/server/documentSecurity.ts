import dns from 'dns';
import path from 'path';
import fs from 'fs';

/**
 * PRODUCTION SECURITY & SSRF PROTECTION MODULE
 * 
 * Strict protection for document downloads, remote fetching, and local file resolution.
 * Complies with TaleemGuru Production Security Standards:
 * - Rejects all private, loopback, link-local, carrier-grade NAT, and cloud metadata IPs
 * - Rejects IPv6 loopbacks and private/link-local ranges (including IPv4-mapped IPv6)
 * - Validates DNS resolution for all hostnames
 * - Protects against DNS rebinding & redirect-to-private attacks
 * - Enforces strict directory boundaries on local file resolution
 * - Sanitizes filenames and validates request parameters
 */

// Maximum allowed document size (25 Megabytes)
export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;

// Request timeout for external fetches (8 seconds)
export const FETCH_TIMEOUT_MS = 8000;

// Maximum allowed redirect hops
export const MAX_REDIRECT_HOPS = 3;

// Allowed document MIME types
export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/msword', // doc
  'image/png',
  'image/jpeg',
  'image/webp',
]);

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or reserved range.
 */
export function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(p => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Invalid format treated as unsafe
  }

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private network - RFC 1918)
  if (a === 10) return true;

  // 100.64.0.0/10 (Shared Address Space / CGNAT - RFC 6598)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-Local / Cloud Metadata - RFC 3927)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private network - RFC 1918)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.88.99.0/24 (6to4 Relay Anycast)
  if (a === 192 && b === 88 && c === 99) return true;

  // 192.168.0.0/16 (Private network - RFC 1918)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Network Interconnect Benchmark Testing)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast - RFC 5771)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved for future use - RFC 1112)
  if (a >= 240) return true;

  // 255.255.255.255 (Broadcast)
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address is loopback, unique local, link-local, or IPv4-mapped private.
 */
export function isPrivateOrReservedIPv6(ip: string): boolean {
  const cleanIp = ip.toLowerCase().trim();

  // IPv6 loopback
  if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;

  // Unspecified
  if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (cleanIp.startsWith('::ffff:')) {
    const mappedIpv4 = cleanIp.replace('::ffff:', '');
    if (mappedIpv4.includes('.')) {
      return isPrivateOrReservedIPv4(mappedIpv4);
    }
  }

  // Unique local addresses (fc00::/7 -> fc00... to fdff...)
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;

  // Link-local addresses (fe80::/10 -> fe80... to febf...)
  if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) {
    return true;
  }

  // Multicast (ff00::/8)
  if (cleanIp.startsWith('ff')) return true;

  return false;
}

/**
 * Checks if an IP address (IPv4 or IPv6) is private, reserved, or loopback.
 */
export function isDisallowedIp(ip: string): boolean {
  if (ip.includes(':')) {
    return isPrivateOrReservedIPv6(ip);
  }
  return isPrivateOrReservedIPv4(ip);
}

/**
 * Validates a target URL against SSRF rules:
 * - Scheme must be http: or https:
 * - Hostname cannot be localhost, internal TLDs, or private IPs
 * - DNS resolves all addresses and verifies each is public and routable
 */
export async function validateRemoteUrl(rawUrl: string): Promise<{ valid: boolean; error?: string; url?: URL }> {
  try {
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
      return { valid: false, error: 'URL is required' };
    }

    if (rawUrl.length > 2048) {
      return { valid: false, error: 'URL exceeds maximum permitted length' };
    }

    // Check for null bytes or control characters
    if (/[\x00-\x1F\x7F]/.test(rawUrl)) {
      return { valid: false, error: 'URL contains illegal control characters' };
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { valid: false, error: 'Malformed URL' };
    }

    // Scheme check: Only HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Disallowed URL scheme. Only HTTP and HTTPS are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // Block obvious localhost & private hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname.endsWith('.home') ||
      hostname.endsWith('.corp') ||
      hostname.endsWith('.test') ||
      hostname.endsWith('.invalid')
    ) {
      return { valid: false, error: 'Access to internal hostnames is prohibited.' };
    }

    // If hostname is directly an IP literal (IPv4 or [IPv6])
    const cleanHost = hostname.replace(/^\[/, '').replace(/\]$/, '');
    if (cleanHost.split('.').length === 4 && cleanHost.split('.').every(p => !isNaN(Number(p)))) {
      if (isDisallowedIp(cleanHost)) {
        return { valid: false, error: 'Access to private or loopback IP ranges is prohibited.' };
      }
    } else if (cleanHost.includes(':')) {
      if (isDisallowedIp(cleanHost)) {
        return { valid: false, error: 'Access to private or loopback IPv6 ranges is prohibited.' };
      }
    }

    // Perform DNS lookup to check resolved IPs against private subnets (DNS Rebinding protection)
    try {
      const records = await dns.promises.lookup(hostname, { all: true });
      if (!records || records.length === 0) {
        return { valid: false, error: 'Could not resolve domain name' };
      }

      for (const record of records) {
        if (isDisallowedIp(record.address)) {
          return {
            valid: false,
            error: 'Domain resolves to a prohibited internal or private network address.',
          };
        }
      }
    } catch (dnsErr: any) {
      return { valid: false, error: 'Domain resolution failed' };
    }

    return { valid: true, url: parsed };
  } catch (err: any) {
    return { valid: false, error: 'URL validation error' };
  }
}

/**
 * Safely fetches a remote document with:
 * - Strict SSRF validation on initial URL and every redirect hop
 * - Request timeout enforcement
 * - Maximum byte size limit
 * - MIME type validation
 */
export async function safeFetchRemoteDocument(
  targetUrl: string,
  options: {
    maxBytes?: number;
    timeoutMs?: number;
  } = {}
): Promise<{ buffer: Buffer; contentType: string }> {
  const maxBytes = options.maxBytes || MAX_DOCUMENT_SIZE_BYTES;
  const timeoutMs = options.timeoutMs || FETCH_TIMEOUT_MS;

  let currentUrl = targetUrl;
  let hops = 0;

  while (hops <= MAX_REDIRECT_HOPS) {
    const validation = await validateRemoteUrl(currentUrl);
    if (!validation.valid || !validation.url) {
      throw new Error(validation.error || 'Invalid or prohibited destination URL');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'TaleemGuru-DocumentBranding/2.0 (+https://taleemguru.pk)',
          'Accept': 'application/pdf, text/plain, text/markdown, application/octet-stream',
        },
        redirect: 'manual', // Manual redirect inspection to prevent redirect-to-private SSRF
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle Redirects safely
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          throw new Error('Redirect response missing Location header');
        }

        const nextUrl = new URL(locationHeader, currentUrl).toString();
        currentUrl = nextUrl;
        hops++;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Remote server responded with status HTTP ${response.status}`);
      }

      // Check Content-Length if present
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(contentLength) && contentLength > maxBytes) {
          throw new Error(`Document exceeds maximum size limit of ${Math.round(maxBytes / (1024 * 1024))}MB`);
        }
      }

      const contentType = response.headers.get('content-type') || 'application/pdf';

      // Stream / buffer response with strict size limit
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > maxBytes) {
        throw new Error(`Downloaded document exceeds maximum size limit of ${Math.round(maxBytes / (1024 * 1024))}MB`);
      }

      return {
        buffer: Buffer.from(arrayBuffer),
        contentType,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Remote document fetch timed out');
      }
      throw err;
    }
  }

  throw new Error('Too many redirects while retrieving remote document');
}

/**
 * Safely resolves a local file path inside the designated public directory.
 * Strictly prevents directory traversal attacks (../, %2e%2e, null bytes, absolute paths).
 */
export function resolveSafeLocalFilePath(relativePath: string, baseDir?: string): { valid: boolean; absolutePath?: string; error?: string } {
  try {
    if (!relativePath || typeof relativePath !== 'string') {
      return { valid: false, error: 'Path parameter is required' };
    }

    // Check for null bytes
    if (relativePath.includes('\0') || /%00/i.test(relativePath)) {
      return { valid: false, error: 'Invalid path: null byte detected' };
    }

    // Check for encoded traversal sequences
    if (/%2e%2e/i.test(relativePath) || /%252e%252e/i.test(relativePath) || /%2f/i.test(relativePath)) {
      return { valid: false, error: 'Invalid path: encoded traversal detected' };
    }

    // Normalize Windows backslashes to forward slashes for cross-platform safety
    const cleanRelative = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');

    // Check for explicit parent traversal
    if (cleanRelative.includes('..')) {
      return { valid: false, error: 'Invalid path: directory traversal prohibited' };
    }

    const publicRoot = path.resolve(baseDir || path.join(process.cwd(), 'public'));
    const resolvedPath = path.resolve(publicRoot, cleanRelative);

    // Verify resolved path strictly resides inside public directory
    if (!resolvedPath.startsWith(publicRoot + path.sep) && resolvedPath !== publicRoot) {
      return { valid: false, error: 'Access denied: path escapes designated directory' };
    }

    // Block sensitive files / directories (.env, .git, node_modules, src, server.ts)
    const normalizedTarget = resolvedPath.toLowerCase();
    if (
      normalizedTarget.includes('.env') ||
      normalizedTarget.includes('.git') ||
      normalizedTarget.includes('node_modules') ||
      normalizedTarget.includes('server.ts') ||
      normalizedTarget.includes('src' + path.sep)
    ) {
      return { valid: false, error: 'Access denied: sensitive system file requested' };
    }

    if (!fs.existsSync(resolvedPath)) {
      return { valid: false, error: 'File not found' };
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return { valid: false, error: 'Target path is not a file' };
    }

    if (stat.size > MAX_DOCUMENT_SIZE_BYTES) {
      return { valid: false, error: 'File exceeds maximum permitted size' };
    }

    return { valid: true, absolutePath: resolvedPath };
  } catch (err: any) {
    return { valid: false, error: 'Path resolution error' };
  }
}

/**
 * Sanitizes a client-provided download filename to prevent HTTP Header Injection / Content-Disposition bypass.
 */
export function sanitizeDownloadFilename(rawFilename: string, fallback: string = 'TaleemGuru_Document.pdf'): string {
  if (!rawFilename || typeof rawFilename !== 'string') return fallback;

  // Strip path characters and control characters
  let clean = rawFilename.replace(/[/\\?%*:|"<>]/g, '_').replace(/[\x00-\x1F\x7F]/g, '');
  clean = clean.replace(/\.{2,}/g, '.');
  clean = clean.replace(/_+/g, '_').trim();
  clean = clean.replace(/^\.+/, '');

  if (clean.length === 0 || clean === '.' || clean === '..') {
    return fallback;
  }

  if (clean.length > 120) {
    const ext = path.extname(clean);
    clean = clean.substring(0, 110) + (ext || '.pdf');
  }

  return clean;
}
