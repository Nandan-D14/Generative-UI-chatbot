import { useState, type FormEvent } from 'react';
import { useSignIn } from '@clerk/clerk-react';

type Step = 'initial' | 'needs-code' | 'needs-password-reset' | 'success';
type AuthMode = 'signin' | 'signup' | 'forgot';

function getErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err && 'errors' in err) {
    const withErrors = err as { errors?: Array<{ message?: string }> };
    const first = withErrors.errors?.[0]?.message;
    if (first) return first;
  }
  if (typeof err === 'object' && err && 'message' in err) {
    const withMessage = err as { message?: string };
    if (withMessage.message) return withMessage.message;
  }
  return fallback;
}

export function CustomSignIn() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [step, setStep] = useState<Step>('initial');

  async function handleInitialSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    try {
      if (mode === 'forgot') {
        await signIn.create({
          strategy: 'reset_password_email_code',
          identifier: email,
        });
        setStep('needs-password-reset');
        setError('');
      } else if (mode === 'signup') {
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
    } catch (err: unknown) {
      console.error('Auth error:', err);
      setError(getErrorMessage(err, 'Authentication failed'));
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
    } catch (err: unknown) {
      console.error('Verification error:', err);
      setError(getErrorMessage(err, 'Verification failed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: verificationCode,
        password: newPassword,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        setStep('success');
        setError('');
        window.location.href = '/chat';
        return;
      }

      setError('Password reset could not be completed. Please try again.');
    } catch (err: unknown) {
      console.error('Reset password error:', err);
      setError(getErrorMessage(err, 'Password reset failed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendCode() {
    if (!signIn) return;
    try {
      if (step === 'needs-password-reset') {
        await signIn.create({
          strategy: 'reset_password_email_code',
          identifier: email,
        });
      } else {
        await signIn.create({
          strategy: 'email_code',
          identifier: email,
        });
      }
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
          {step === 'needs-password-reset'
            ? 'Enter the code sent to your email and choose a new password'
            : step === 'needs-code'
            ? 'Enter the verification code sent to your email'
            : mode === 'forgot'
              ? 'We’ll send you a code to reset your password'
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

      {step === 'needs-password-reset' ? (
        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '1rem' }}>
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

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.25rem',
            }}>
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
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

          <button
            type="submit"
            disabled={isSubmitting || verificationCode.length < 4 || newPassword.length < 8}
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
              cursor: (isSubmitting || verificationCode.length < 4 || newPassword.length < 8) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || verificationCode.length < 4 || newPassword.length < 8) ? 0.6 : 1,
              minHeight: '2.5rem',
            }}
          >
            {isSubmitting ? 'Resetting...' : 'Reset password'}
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
              onClick={() => {
                setStep('initial');
                setMode('signin');
                setVerificationCode('');
                setNewPassword('');
                setError('');
              }}
              style={{ color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Back to sign in
            </span>
          </div>
        </form>
      ) : step === 'needs-code' ? (
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
              <div style={{ marginBottom: '0.5rem' }}>
                <span
                  onClick={() => {
                    setMode('forgot');
                    setPassword('');
                    setError('');
                  }}
                  style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Forgot password?
                </span>
              </div>
              Don't have an account?{' '}
              <span
                onClick={() => setMode('signup')}
                style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign up
              </span>
            </>
          ) : mode === 'forgot' ? (
            <>
              Remember your password?{' '}
              <span
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
                style={{ color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign in
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
