import type { Metadata } from 'next';
import SignupForm from './SignupForm';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your Academyflo academy management account',
};

export default function SignupPage() {
  return <SignupForm />;
}
