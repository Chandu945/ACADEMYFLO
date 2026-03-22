import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your PlayConnect academy management account',
};

export default function LoginPage() {
  return <LoginForm />;
}
