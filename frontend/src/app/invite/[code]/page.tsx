'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ApiService } from '../../../services/api';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const code = (params?.code as string)?.toUpperCase();

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');

  useEffect(() => {
    if (!code) {
      setStatus('invalid');
      return;
    }

    const resolve = async () => {
      try {
        const res = await ApiService.validateReferralCode(code);
        if (res.success && res.referralCode) {
          // Persist referral code for signup flow
          localStorage.setItem('pendingReferral', res.referralCode);
          // Record the open event (fire and forget)
          ApiService.recordReferralOpen(code).catch(() => {});
          setStatus('valid');
          // Redirect to login after brief confirmation
          setTimeout(() => router.replace('/login'), 1200);
        } else {
          setStatus('invalid');
          setTimeout(() => router.replace('/login'), 2000);
        }
      } catch {
        setStatus('invalid');
        setTimeout(() => router.replace('/login'), 2000);
      }
    };

    resolve();
  }, [code, router]);

  return (
    <div style={{
      height: '100dvh',
      width: '100%',
      background: '#07090e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      gap: '16px',
    }}>
      {status === 'loading' && (
        <>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            border: '2px solid #1c2a3a', borderTop: '2px solid #6fa3f7',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#57697e', fontSize: '13px', margin: 0 }}>Verifying invite...</p>
        </>
      )}

      {status === 'valid' && (
        <>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'rgba(74,222,128,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10L8 14L16 6" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p style={{ color: '#a8c0d8', fontSize: '14px', margin: 0, fontWeight: 500 }}>Invite accepted</p>
          <p style={{ color: '#3d5166', fontSize: '12px', margin: 0 }}>Taking you to sign up...</p>
        </>
      )}

      {status === 'invalid' && (
        <>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6 6L14 14M14 6L6 14" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ color: '#a8c0d8', fontSize: '14px', margin: 0, fontWeight: 500 }}>Invalid invite link</p>
          <p style={{ color: '#3d5166', fontSize: '12px', margin: 0 }}>Redirecting...</p>
        </>
      )}
    </div>
  );
}
