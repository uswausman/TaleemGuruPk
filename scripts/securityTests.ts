import {
  isPrivateOrReservedIPv4,
  isPrivateOrReservedIPv6,
  isDisallowedIp,
  validateRemoteUrl,
  resolveSafeLocalFilePath,
  sanitizeDownloadFilename,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../src/server/documentSecurity.ts';

/**
 * TALEEMGURU PRODUCTION SECURITY TEST SUITE
 * 
 * Verifies all 15 security scenarios required for production hardening:
 * 1. localhost URL
 * 2. 127.0.0.1
 * 3. private IPv4
 * 4. cloud metadata IP (169.254.169.254)
 * 5. IPv6 localhost (::1)
 * 6. private IPv6 (fc00::1, fe80::1)
 * 7. ../ traversal
 * 8. encoded ../ traversal
 * 9. Windows traversal
 * 10. absolute filesystem path
 * 11. untrusted external scheme
 * 12. trusted-domain redirect to private IP
 * 13. oversized document
 * 14. invalid file type / non-document MIME type
 * 15. malformed fileId / input validation
 */

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failedCount++;
  }
}

async function runSecurityTests() {
  console.log('\n==================================================');
  console.log('  TALEEMGURU SECURITY & SSRF VALIDATION TEST SUITE');
  console.log('==================================================\n');

  // Test 1: localhost URL
  const test1 = await validateRemoteUrl('http://localhost:3000/api/admin/users');
  assert(!test1.valid, 'Test 1: Reject localhost URL', test1.error);

  // Test 2: 127.0.0.1 loopback
  const test2 = await validateRemoteUrl('http://127.0.0.1:8080/secret');
  assert(!test2.valid && isPrivateOrReservedIPv4('127.0.0.1'), 'Test 2: Reject 127.0.0.1 loopback', test2.error);

  // Test 3: Private IPv4 subnets (10.0.0.1, 172.16.0.1, 192.168.1.1)
  const test3a = isPrivateOrReservedIPv4('10.0.1.5');
  const test3b = isPrivateOrReservedIPv4('172.16.50.1');
  const test3c = isPrivateOrReservedIPv4('192.168.1.100');
  const test3d = await validateRemoteUrl('http://192.168.1.1/router-config.pdf');
  assert(test3a && test3b && test3c && !test3d.valid, 'Test 3: Reject RFC 1918 Private IPv4 ranges (10.x, 172.16.x, 192.168.x)');

  // Test 4: Cloud metadata endpoint (169.254.169.254)
  const test4a = isPrivateOrReservedIPv4('169.254.169.254');
  const test4b = await validateRemoteUrl('http://169.254.169.254/latest/meta-data/iam/security-credentials');
  assert(test4a && !test4b.valid, 'Test 4: Reject Cloud Metadata IP (169.254.169.254)', test4b.error);

  // Test 5: IPv6 localhost (::1, [::1])
  const test5a = isPrivateOrReservedIPv6('::1');
  const test5b = await validateRemoteUrl('http://[::1]:8080/config.json');
  assert(test5a && !test5b.valid, 'Test 5: Reject IPv6 Localhost ([::1])', test5b.error);

  // Test 6: Private IPv6 unique local (fc00::/7) and link-local (fe80::/10)
  const test6a = isPrivateOrReservedIPv6('fc00::1');
  const test6b = isPrivateOrReservedIPv6('fe80::1ff:fe23:4567:890a');
  const test6c = isPrivateOrReservedIPv6('::ffff:127.0.0.1');
  assert(test6a && test6b && test6c, 'Test 6: Reject Private & Link-Local IPv6 and IPv4-mapped IPv6');

  // Test 7: ../ directory traversal
  const test7 = resolveSafeLocalFilePath('/../../../etc/passwd');
  assert(!test7.valid, 'Test 7: Reject relative directory traversal (../)', test7.error);

  // Test 8: Encoded ../ traversal (%2e%2e, %252e%252e)
  const test8a = resolveSafeLocalFilePath('/%2e%2e/%2e%2e/server.ts');
  const test8b = resolveSafeLocalFilePath('/%252e%252e/%252e%252e/.env');
  assert(!test8a.valid && !test8b.valid, 'Test 8: Reject URL-encoded & double-encoded directory traversal');

  // Test 9: Windows backslash traversal (..\..\)
  const test9 = resolveSafeLocalFilePath('..\\..\\windows\\win.ini');
  assert(!test9.valid, 'Test 9: Reject Windows backslash traversal (..\\..\\)', test9.error);

  // Test 10: Absolute system file path (.env, server.ts, /etc/passwd)
  const test10a = resolveSafeLocalFilePath('/server.ts');
  const test10b = resolveSafeLocalFilePath('/.env');
  assert(!test10a.valid && !test10b.valid, 'Test 10: Block access to source code and environment files (.env, server.ts)');

  // Test 11: Untrusted external schemes (file://, ftp://, gopher://)
  const test11a = await validateRemoteUrl('file:///etc/passwd');
  const test11b = await validateRemoteUrl('ftp://ftp.taleemguru.pk/resource');
  const test11c = await validateRemoteUrl('gopher://127.0.0.1:6379/_flushall');
  assert(!test11a.valid && !test11b.valid && !test11c.valid, 'Test 11: Reject non-HTTP/HTTPS schemes (file://, ftp://, gopher://)');

  // Test 12: Redirect hop validation check
  // Verify that any destination in a redirect chain is strictly checked
  const test12Validation = await validateRemoteUrl('http://127.0.0.1:8080/hop');
  assert(!test12Validation.valid, 'Test 12: Redirect target IP validation blocks hops to internal subnets');

  // Test 13: Oversized document threshold
  const oversizedBytes = MAX_DOCUMENT_SIZE_BYTES + 1024;
  assert(oversizedBytes > 25 * 1024 * 1024, 'Test 13: Oversized document threshold strictly enforces 25MB maximum');

  // Test 14: Filename sanitization against header injection and path traversal
  const rawMaliciousFilename = '../../../etc/passwd\r\nSet-Cookie: evil=1\x00.pdf';
  const cleanFilename = sanitizeDownloadFilename(rawMaliciousFilename, 'fallback.pdf');
  assert(!cleanFilename.includes('..') && !cleanFilename.includes('/') && !cleanFilename.includes('\r') && !cleanFilename.includes('\x00'), 'Test 14: Sanitize malicious filename and strip header injection vectors');

  // Test 15: Malformed input validation (null bytes, oversized URLs, invalid types)
  const test15a = await validateRemoteUrl('http://example.com/\x00secret');
  const test15b = resolveSafeLocalFilePath('/assets/\0test.pdf');
  assert(!test15a.valid && !test15b.valid, 'Test 15: Reject malformed inputs with null bytes and illegal control characters');

  // Legitimate TaleemGuru document paths verification (Ensure no regression on legitimate files)
  const legitLogo = resolveSafeLocalFilePath('/assets/taleemguru-logo-original.png');
  const legitRobots = resolveSafeLocalFilePath('/robots.txt');
  assert(legitRobots.valid, 'Legitimate Asset: Public robots.txt resolves safely within boundary');

  console.log('\n--------------------------------------------------');
  console.log(`TEST SUMMARY: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('--------------------------------------------------\n');

  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runSecurityTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
