import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Delete your Academyflo account',
  description:
    'How to permanently delete your Academyflo account and personal data — '
    + 'either from inside the mobile app or by emailing us.',
  robots: { index: true, follow: true },
};

export default function AccountDeletionPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Delete your Academyflo account</h1>
        <p className={styles.lede}>
          You can permanently delete your Academyflo account and personal data
          at any time, using either of the methods below.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.h2}>
          <span className={styles.stepBadge}>1</span>
          From the mobile app (recommended)
        </h2>
        <ol className={styles.stepList}>
          <li>Open the <strong>Academyflo</strong> app on Android or iOS.</li>
          <li>
            Tap <strong>More</strong> in the bottom navigation.
          </li>
          <li>
            Scroll to <strong>Account</strong> and tap{' '}
            <strong>Delete Account</strong>.
          </li>
          <li>
            Re-enter your password and type{' '}
            <span className={styles.code}>DELETE</span> to confirm.
          </li>
          <li>
            Your account is then scheduled for deletion in 30 days. You can
            cancel any time before that date by signing back in and tapping{' '}
            <em>Cancel deletion</em>.
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>
          <span className={styles.stepBadge}>2</span>
          By email
        </h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          Send a deletion request from your registered email address to{' '}
          <a href="mailto:academyflo.privacy@gmail.com" className={styles.link}>
            academyflo.privacy@gmail.com
          </a>
          {' '}with the subject line <strong>&ldquo;Delete my account&rdquo;</strong>.
          We may reply to confirm your identity. Once confirmed, your account
          will be deleted within 30 days, subject to the legal retention rules
          in our{' '}
          <a
            href="https://info.academyflo.com/privacy-policy"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>What gets deleted</h2>
        <ul className={styles.itemList}>
          <li>Your name, email, phone number, and profile photo.</li>
          <li>
            <strong>Academy Owners:</strong> all academy data — students, coaches,
            parents, attendance, fees, expenses, batches, events, and gallery
            photos. The academy itself is permanently removed.
          </li>
          <li>
            <strong>Coaches and Parents:</strong> only your personal profile.
            Records associated with the academy continue to be managed by the
            academy owner.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>What is retained, and why</h2>
        <ul className={styles.itemList}>
          <li>
            <strong>Audit logs</strong> — for security and abuse investigation.
          </li>
          <li>
            <strong>Payment receipts and tax records</strong> — retained for up
            to 8 years under Indian tax law.
          </li>
          <li>
            <strong>Anonymised usage statistics</strong> that cannot be linked
            back to you — for product analytics.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Deletion timeline</h2>
        <div className={styles.callout}>
          <p className={styles.calloutBody}>
            Once a deletion is confirmed, your personal information is{' '}
            <strong>permanently removed within 30 days</strong>. Routine backups
            containing your data are overwritten within an additional 30 days.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>
          Questions about deletion? Contact us at{' '}
          <a href="mailto:academyflo.privacy@gmail.com" className={styles.link}>
            academyflo.privacy@gmail.com
          </a>
          {' '}or call <a href="tel:+919381811885" className={styles.link}>+91 93818 11885</a>.
        </p>
        <p>
          See also our{' '}
          <a
            href="https://info.academyflo.com/privacy-policy"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
