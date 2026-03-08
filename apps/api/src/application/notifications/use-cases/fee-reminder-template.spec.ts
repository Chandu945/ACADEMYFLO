import { renderFeeReminderEmail } from './fee-reminder-template';

describe('renderFeeReminderEmail', () => {
  const baseData = {
    studentName: 'Arun Sharma',
    academyName: 'Play Academy',
    amount: 500,
    dueDate: '2024-03-05',
    monthKey: '2024-03',
  };

  it('should render HTML with correct data', () => {
    const html = renderFeeReminderEmail(baseData);
    expect(html).toContain('Arun Sharma');
    expect(html).toContain('Play Academy');
    expect(html).toContain('2024-03-05');
    expect(html).toContain('2024-03');
    expect(html).toContain('\u20B9500');
  });

  it('should escape HTML in student and academy names', () => {
    const html = renderFeeReminderEmail({
      ...baseData,
      studentName: '<script>alert("xss")</script>',
      academyName: 'A & B "Academy"',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B &quot;Academy&quot;');
  });

  it('should format INR currency', () => {
    const html = renderFeeReminderEmail({ ...baseData, amount: 1500 });
    expect(html).toContain('\u20B9');
    expect(html).toContain('1,500');
  });
});
