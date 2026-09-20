'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // If already logged in skip landing
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/app');
    }
  }, [user, isLoading, router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: #07090e;
          color: #e8edf2;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
        }

        .landing {
          height: 100dvh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, #0f1a2e 0%, #07090e 60%);
        }

        /* subtle grid */
        .landing::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent);
          pointer-events: none;
        }

        .content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
          text-align: center;
          padding: 0 24px;
        }

        .headline {
          font-size: clamp(2.2rem, 6vw, 4rem);
          font-weight: 700;
          line-height: 1.12;
          letter-spacing: -0.03em;
          color: #f0f4f8;
          max-width: 640px;
        }

        .headline span {
          background: linear-gradient(135deg, #a8c8ff 0%, #6fa3f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sub {
          font-size: 15px;
          font-weight: 400;
          color: #57697e;
          max-width: 420px;
          line-height: 1.65;
        }

        .cta-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .btn-primary {
          background: #e8edf2;
          color: #07090e;
          border: none;
          padding: 13px 32px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          letter-spacing: -0.01em;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 24px rgba(168,200,255,0.12);
        }

        .btn-primary:hover {
          background: #ffffff;
          box-shadow: 0 4px 32px rgba(168,200,255,0.2);
        }

        .btn-primary:active {
          transform: scale(0.98);
        }

        .btn-ghost {
          background: transparent;
          color: #57697e;
          border: 1px solid rgba(255,255,255,0.08);
          padding: 13px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.15s, border-color 0.15s;
        }

        .btn-ghost:hover {
          color: #a8c0d8;
          border-color: rgba(255,255,255,0.15);
        }

        .divider {
          width: 1px;
          height: 14px;
          background: rgba(255,255,255,0.08);
        }

        .features {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 4px;
        }

        .feature {
          font-size: 12px;
          color: #3d5166;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 400;
        }

        .feature-check {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(74,222,128,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-check svg {
          width: 8px;
          height: 8px;
        }

        /* footer */
        .footer {
          position: absolute;
          bottom: 28px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 11px;
          color: #283344;
          letter-spacing: 0.03em;
        }

        .footer a {
          color: #ebec9aff;
          text-decoration: none;
          transition: color 0.15s;
        }

        .footer a:hover {
          color: #c2060fff;
        }
      `}</style>

      <div className="landing">
        <div className="content">
          <h1 className="headline">
            Chat with people<br />
            <span>around you</span>
          </h1>

          <p className="sub">
            No profiles. No history. Just real conversations with people nearby.
          </p>

          <div className="cta-row">
            <button
              className="btn-primary"
              onClick={() => router.push('/login')}
            >
              Get Started
            </button>
            <div className="divider" />
            <button
              className="btn-ghost"
              onClick={() => router.push('/login')}
            >
              Sign in
            </button>
          </div>

          <div className="features">
            {[
              'No real name needed',
              'Location based',
              'Disappears on logout',
            ].map((f) => (
              <div className="feature" key={f}>
                <span className="feature-check">
                  <svg viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2.5" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {f}
              </div>
            ))}
          </div>
        </div>

        <div className="footer">
          Powered by <a href="https://kxoproduction.in" target="_blank" rel="noopener noreferrer">KxoProduction</a>
        </div>
      </div>
    </>
  );
}
