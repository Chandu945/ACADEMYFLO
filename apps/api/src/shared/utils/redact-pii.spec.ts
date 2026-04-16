import { redactPII } from './redact-pii';

describe('redactPII', () => {
  it('redacts a single email', () => {
    expect(redactPII('contact user@example.com for help')).toBe(
      'contact [REDACTED_EMAIL] for help',
    );
  });

  it('redacts multiple emails in one string', () => {
    expect(redactPII('a@x.com and b@y.co are both bad')).toBe(
      '[REDACTED_EMAIL] and [REDACTED_EMAIL] are both bad',
    );
  });

  it('redacts E.164 phones', () => {
    expect(
      redactPII("customer_phone '+919876543210' is invalid"),
    ).toBe("customer_phone '[REDACTED_PHONE]' is invalid");
  });

  it('redacts plain 10-digit Indian mobiles', () => {
    expect(redactPII('received 9876543210 which is not valid')).toBe(
      'received [REDACTED_PHONE] which is not valid',
    );
  });

  it('does NOT redact short digit sequences (amounts)', () => {
    expect(redactPII('order_amount must be >= 500')).toBe(
      'order_amount must be >= 500',
    );
  });

  it('does NOT redact order IDs (alphanumeric with underscores)', () => {
    // 15-digit sequence preceded/followed by non-word chars would match the
    // E.164 pattern only with leading +; without + it is untouched.
    expect(redactPII('order_id FEE_20240115_abc123def')).toBe(
      'order_id FEE_20240115_abc123def',
    );
  });

  it('redacts both email and phone in the same error', () => {
    expect(
      redactPII("invalid customer: 'rahul@x.com' with +919000000000"),
    ).toBe("invalid customer: '[REDACTED_EMAIL]' with [REDACTED_PHONE]");
  });

  it('truncates to maxLen and appends ellipsis', () => {
    const long = 'x'.repeat(250);
    const out = redactPII(long, 50);
    expect(out.length).toBe(51); // 50 chars + ellipsis
    expect(out.endsWith('…')).toBe(true);
  });

  it('keeps strings shorter than maxLen as-is', () => {
    expect(redactPII('short')).toBe('short');
  });

  it('handles empty string', () => {
    expect(redactPII('')).toBe('');
  });
});
