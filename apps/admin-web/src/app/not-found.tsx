import Link from 'next/link';

import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.wrapper}>
      <h2>Page not found</h2>
      <p className={styles.description}>The page you are looking for does not exist.</p>
      <Link href="/dashboard" className={styles.link}>
        Go to Dashboard
      </Link>
    </div>
  );
}
