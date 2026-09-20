'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Copy, Share2, Check } from 'lucide-react';
import { ApiService } from '../../services/api';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [referralCode, setReferralCode] = useState<string>('');
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    ApiService.getMyReferral()
      .then((res) => {
        if (res.success) {
          setReferralCode(res.referralCode);
          setInviteUrl(res.inviteUrl);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleCopy = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for browsers that block clipboard
      const el = document.createElement('textarea');
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteUrl]);

  const handleShare = useCallback(async () => {
    if (!inviteUrl) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Join me on AnymChat', url: inviteUrl });
        return;
      } catch {}
    }
    handleCopy();
  }, [inviteUrl, handleCopy]);

  if (!isOpen) return null;

  const qrUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=E8EDF2&bgcolor=0D1520&data=${encodeURIComponent(inviteUrl)}`
    : '';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(7,9,14,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#0d1520',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '28px 24px',
        width: '100%',
        maxWidth: '340px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        position: 'relative',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#3d5166', padding: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '6px', transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#8a99ad')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#3d5166')}
        >
          <X size={16} />
        </button>

        {/* Title */}
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#e8edf2', letterSpacing: '-0.01em' }}>
          Invite someone
        </p>

        {isLoading ? (
          <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              border: '2px solid #1c2a3a', borderTop: '2px solid #6fa3f7',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* QR Code */}
            <div style={{
              background: '#0d1520',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}>
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="Invite QR Code"
                  width={160}
                  height={160}
                  style={{ borderRadius: '8px', display: 'block' }}
                />
              ) : (
                <div style={{ width: 160, height: 160, background: '#111a27', borderRadius: '8px' }} />
              )}
              {/* Referral Code below QR */}
              <span style={{
                fontFamily: 'monospace',
                fontSize: '15px',
                fontWeight: 700,
                color: '#a8c8ff',
                letterSpacing: '0.12em',
              }}>
                {referralCode}
              </span>
            </div>

            {/* Invite URL (truncated display) */}
            <div style={{
              width: '100%',
              background: '#0a1018',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '11px',
              color: '#57697e',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              fontFamily: 'monospace',
            }}>
              {inviteUrl || '—'}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '11px',
                  background: copied ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${copied ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '8px',
                  color: copied ? '#4ade80' : '#a8c0d8',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>

              <button
                onClick={handleShare}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '11px',
                  background: 'rgba(111,163,247,0.06)',
                  border: '1px solid rgba(111,163,247,0.15)',
                  borderRadius: '8px',
                  color: '#6fa3f7',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              >
                <Share2 size={14} />
                Share
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
