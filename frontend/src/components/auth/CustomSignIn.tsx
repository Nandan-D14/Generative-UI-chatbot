import { useState, type FormEvent } from 'react';
import { useSignIn } from '@clerk/clerk-react';

type Step = 'initial' | 'needs-code' | 'needs-password' | 'success';

export function CustomSignIn() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [step, setStep] = useState<Step>('initial');

  async function handleInitialSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        // Create a new user via Clerk sign-up
        await signIn.create({
          strategy: 'email_code',
          identifier: email,
        });
        setStep('needs-code');
        setError('');
      } else {
        // Sign in with password
        await signIn.create({
          identifier: email,
          password,
        });

        const result = await signIn.attemptFirstFactor({
          strategy: 'password',
          password,
        });

        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          window.location.href = '/chat';
          return;
        }

        // If we need email verification
        if (result.status === 'needs_second_factor') {
          setStep('needs-code');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const msg = err?.errors?.[0]?.message || err?.message || 'Authentication failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: verificationCode,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        setStep('success');
        setError('');
        window.location.href = '/chat';
        return;
      }

      if (result.status !== 'complete') {
        setError('Invalid or expired code. Please try again.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      const msg = err?.errors?.[0]?.message || err?.message || 'Verification failed';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    if (!signIn) return;
    try {
      await signIn.prepareFirstFactor({ strategy: 'email_code' });
      setError('');
    } catch {
      setError('Failed to resend code');
    }
  }

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '28rem',
      width: '100%',
      background: '#ffffff',
      borderRadius: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
      padding: '2rem',
    }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '0.25rem',
        }}>
          VisualMind
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {step === 'needs-code'
            ? 'Enter the verification code sent to your email'
            : mode === 'signin'
              ? 'Sign in to continue'
              : 'Create your account'}
        </p>
      </div>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {step === 'needs-code' ? (
        /* Verification Code Form */
        <form onSubmit={handleVerifyCode}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.25rem',
            }}>
              Verification code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              placeholder="e.g. 123456"
              maxLength={6}
              autoComplete="one-time-code"
              style={{
                display: 'block',
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '1.125rem',
                letterSpacing: '0.25em',
                textAlign: 'center',
                lineHeight: '1.5',
                color: '#111827',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
              Sent to {email}
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || verificationCode.length < 4}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              lineHeight: '1.25',
              color: '#ffffff',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: (isSubmitting || verificationCode.length < 4) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || verificationCode.length < 4) ? 0.6 : 1,
              minHeight: '2.5rem',
            }}
          >
            {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
          </button>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={resendCode}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.875rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Resend code
            </button>
          </div>

          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            fontSize: '0.875rem',
          }}>
            <span
              onClick={() => { setStep('initial'); setError(''); }}
              style={{ color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Back to sign in
            </span>
          </div>
        </form>
      ) : (
        /* Email/Password Form */
        <form onSubmit={handleInitialSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.25rem',
            }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                display: 'block',
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                lineHeight: '1.5',
                color: '#111827',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {mode === 'signin' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.25rem',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.5',
                  color: '#111827',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email || (mode === 'signin' && !password)}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              lineHeight: '1.25',
              color: '#ffffff',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: (isSubmitting || !email || (mode === 'signin' && !password)) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || !email || (mode === 'signin' && !password)) ? 0.6 : 1,
              minHeight: '2.5rem',
            }}
          >
            {isSubmitting ? 'Processing...' : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </button>
        </form>
      )}

      {step === 'initial' && (
        <div style={{
          marginTop: '1rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: '#6b7280',
        }}>
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <span
                onClick={() => setMode('signup')}
                style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign up
              </span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span
                onClick={() => setMode('signin')}
                style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign in
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
