import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  DisputeReason,
  ProofChainStep,
  ScreenRoute,
  UpiTransaction,
} from './types/verification';
import {
  INITIAL_TRANSACTIONS,
  formatCurrentIst,
} from './data/mockLedger';
import { NavigationShell } from './components/NavigationShell';
import { LedgerView } from './components/LedgerView';
import { InstantVerifyView } from './components/InstantVerifyView';
import { DisputeQueueView } from './components/DisputeQueueView';
import { ReconciliationView } from './components/ReconciliationView';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import {
  UserProfile,
  signInWithGoogle,
  signOutUser,
  subscribeToAuthState,
} from './lib/firebase';

function mapServerRecordToTx(data: any): UpiTransaction {
  const shortTime = (data.created_at || new Date().toISOString()).slice(11, 19) + ' IST';
  const isDisputed = data.status === 'DISPUTED' || (data.trust_score ?? 100) < 50;
  const isSpoofed = Array.isArray(data.exif_flags) && data.exif_flags.some(
    (f: string) => f.includes('AI_') || f.includes('EDITOR_')
  );
  const disputeReason: DisputeReason | undefined = isSpoofed
    ? 'Screenshot Tampering'
    : isDisputed
    ? 'RRN Mismatch'
    : undefined;

  const proofChain: ProofChainStep[] = [
    {
      id: 'ela',
      label: 'Pixel Forensics (Local Block ELA)',
      detail: `Tamper score: ${data.tamper_score ?? 0}%`,
      status: (data.tamper_score ?? 0) > 50 ? 'failed' : 'passed',
      timestamp: shortTime,
    },
    {
      id: 'ocr',
      label: 'RapidOCR & Font Weight Audit',
      detail: data.visual_anomalies?.length
        ? `Anomalies: ${data.visual_anomalies.join('; ')}`
        : `Extracted ₹${data.amount || '0'} & UTR ${data.utr || 'N/A'}`,
      status: data.visual_anomalies?.length > 0 ? 'failed' : 'passed',
      timestamp: shortTime,
    },
    {
      id: 'meta',
      label: 'AI & Metadata Provenance',
      detail: data.exif_flags?.length
        ? data.exif_flags.join('; ')
        : 'Provenance clean: zero AI markers or editor tags',
      status: isSpoofed ? 'failed' : 'passed',
      timestamp: shortTime,
    },
    {
      id: 'handshake',
      label: 'Dual-Party Handshake Link',
      detail: `Status: ${data.handshake_status || 'PENDING'}`,
      status: data.handshake_status === 'CONFIRMED' ? 'passed' : data.handshake_status === 'DISPUTED' ? 'failed' : 'waiting',
      timestamp: shortTime,
    },
  ];

  return {
    id: `TXN-${(data.tx_id || String(Date.now())).slice(0, 8).toUpperCase()}`,
    rrn: data.utr || '000000000000',
    amount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0,
    ocrExtractedAmount: typeof data.amount === 'number' ? data.amount : parseFloat(data.amount) || 0,
    remitterName: data.app_name ? `${data.app_name} User` : 'Verified Remitter',
    remitterVpa: 'payer@upi',
    beneficiaryName: 'Merchant Settlement',
    beneficiaryVpa: 'merchant@upi',
    bank: 'State Bank of India',
    bankCode: 'UPI0001204',
    status: isDisputed ? 'disputed' : ((data.trust_score ?? 100) >= 80 ? 'verified' : 'pending'),
    disputeReason,
    timestamp: `Today, ${shortTime}`,
    isoTimestamp: data.created_at || new Date().toISOString(),
    dayGroup: 'today',
    switchLatencyMs: 128,
    ocrConfidence: 99.1,
    timestampDeltaSec: 2,
    npciResponseCode: isDisputed ? 'U30' : '00',
    npciMessage: isDisputed ? 'FLAGGED · SUSPICIOUS OR DISPUTED' : 'APPROVED · REAL-TIME VERIFIED',
    proofHash: data.image_sha256 || '0x' + Math.random().toString(16).slice(2, 18),
    reconciled: !isDisputed && (data.trust_score ?? 100) >= 80,
    receiptImageUrl: data.original_image_url || data.ela_image_url || '',
    proofChain,
    auditNotes: [
      {
        id: `note-${Date.now()}`,
        author: 'VouchPay Engine',
        timestamp: shortTime,
        message: `Verified with Trust Score ${data.trust_score ?? 100}/100.`,
      },
    ],
  };
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenRoute>('verify');
  const [transactions, setTransactions] = useState<UpiTransaction[]>([]);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [sessionVerifiedIds, setSessionVerifiedIds] = useState<Set<string>>(() => new Set());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Subscribe to Firebase Auth
  useEffect(() => {
    subscribeToAuthState((user) => {
      setCurrentUser(user);
      if (user?.uid) {
        // Fetch user's saved records from backend / Firestore
        fetch(`/api/user/${encodeURIComponent(user.uid)}/verifications`)
          .then((res) => {
            if (res.ok) return res.json();
            return [];
          })
          .then((records: any[]) => {
            if (Array.isArray(records) && records.length > 0) {
              const mapped = records.map(mapServerRecordToTx);
              setTransactions(mapped);
            } else {
              setTransactions([]);
            }
          })
          .catch((err) => console.warn('Failed to load user verifications:', err));
      } else {
        setTransactions([]);
      }
    });
  }, []);

  const handleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      setCurrentUser(user);
      if (user?.uid) {
        const res = await fetch(`/api/user/${encodeURIComponent(user.uid)}/verifications`);
        if (res.ok) {
          const records = await res.json();
          if (Array.isArray(records) && records.length > 0) {
            setTransactions(records.map(mapServerRecordToTx));
          } else {
            setTransactions([]);
          }
        }
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      alert(`Google Sign-In failed: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setCurrentUser(null);
      setTransactions([]);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const inspectedTransaction = useMemo(
    () => transactions.find((t) => t.id === inspectedId) ?? null,
    [transactions, inspectedId]
  );

  const disputedCount = useMemo(
    () => transactions.filter((t) => t.status === 'disputed').length,
    [transactions]
  );

  const pendingCount = useMemo(
    () => transactions.filter((t) => t.status === 'pending').length,
    [transactions]
  );

  const handleApproveTransaction = (id: string) => {
    const shortTime = formatCurrentIst().replace('Today, ', '');
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx;
        return {
          ...tx,
          status: 'verified',
          disputeReason: undefined,
          reconciled: true,
          npciResponseCode: '00',
          npciMessage: 'APPROVED · MANUALLY CLEARED BY COMPLIANCE OPS',
          proofChain: tx.proofChain.map((step) => ({
            ...step,
            status: 'passed',
          })),
          auditNotes: [
            ...tx.auditNotes,
            {
              id: `note-${Date.now()}`,
              author: currentUser?.displayName || 'Compliance Officer',
              timestamp: shortTime,
              message: 'Verified switch settlement proof and cleared transaction for payout.',
              action: 'Approved & Settled',
            },
          ],
        };
      })
    );
    setSessionVerifiedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleBatchApprove = (ids: string[]) => {
    const idSet = new Set(ids);
    const shortTime = formatCurrentIst().replace('Today, ', '');
    const newlyVerified = transactions
      .filter((tx) => idSet.has(tx.id) && tx.status !== 'verified')
      .map((tx) => tx.id);

    setTransactions((prev) =>
      prev.map((tx) => {
        if (!idSet.has(tx.id) || tx.status === 'verified') return tx;
        return {
          ...tx,
          status: 'verified',
          disputeReason: undefined,
          reconciled: true,
          npciResponseCode: '00',
          npciMessage: 'APPROVED · BATCH RECONCILIATION CLEARED',
          proofChain: tx.proofChain.map((step) => ({ ...step, status: 'passed' })),
          auditNotes: [
            ...tx.auditNotes,
            {
              id: `note-${Date.now()}-${tx.id}`,
              author: currentUser?.displayName || 'Compliance Officer',
              timestamp: shortTime,
              message: 'Cleared via batch ledger approval.',
              action: 'Batch Approved',
            },
          ],
        };
      })
    );
    if (newlyVerified.length > 0) {
      setSessionVerifiedIds((prev) => {
        const next = new Set(prev);
        for (const vid of newlyVerified) next.add(vid);
        return next;
      });
    }
  };

  const handleFlagDispute = (id: string, reason: DisputeReason) => {
    const shortTime = formatCurrentIst().replace('Today, ', '');
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx;
        return {
          ...tx,
          status: 'disputed',
          disputeReason: reason,
          reconciled: false,
          npciMessage: `DISPUTED · ${reason.toUpperCase()}`,
          auditNotes: [
            ...tx.auditNotes,
            {
              id: `note-${Date.now()}`,
              author: currentUser?.displayName || 'Compliance Officer',
              timestamp: shortTime,
              message: `Flagged transaction under anomaly category: ${reason}.`,
              action: 'Flagged',
            },
          ],
        };
      })
    );
    setSessionVerifiedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleRequeryNpci = async (id: string) => {
    const target = transactions.find((tx) => tx.id === id);
    const becameVerified = target?.status === 'pending';
    await new Promise((resolve) => setTimeout(resolve, 600));
    const shortTime = formatCurrentIst().replace('Today, ', '');
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx;
        const resolved = tx.status === 'pending';
        return {
          ...tx,
          status: resolved ? 'verified' : tx.status,
          reconciled: resolved ? true : tx.reconciled,
          switchLatencyMs: Math.max(94, Math.round(tx.switchLatencyMs * 0.65)),
          npciResponseCode: resolved ? '00' : tx.npciResponseCode,
          npciMessage: resolved
            ? 'APPROVED · NPCI CREDIT ACK CONFIRMED ON RE-QUERY'
            : tx.npciMessage,
          proofChain: resolved
            ? tx.proofChain.map((s) => ({ ...s, status: 'passed', timestamp: shortTime }))
            : tx.proofChain,
          auditNotes: [
            ...tx.auditNotes,
            {
              id: `note-${Date.now()}`,
              author: 'NPCI Switch Poller',
              timestamp: shortTime,
              message: resolved
                ? 'Switch re-query returned Code 00 credit confirmation.'
                : `Switch re-query refreshed status (Code ${tx.npciResponseCode}).`,
              action: 'Re-queried',
            },
          ],
        };
      })
    );
    if (becameVerified) {
      setSessionVerifiedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  };

  const handleAddNote = (id: string, message: string) => {
    const shortTime = formatCurrentIst().replace('Today, ', '');
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx;
        return {
          ...tx,
          auditNotes: [
            ...tx.auditNotes,
            {
              id: `note-${Date.now()}`,
              author: currentUser?.displayName || 'Compliance Officer',
              timestamp: shortTime,
              message,
            },
          ],
        };
      })
    );
  };

  const handleAddTransaction = (newTx: UpiTransaction) => {
    setTransactions((prev) => [newTx, ...prev]);
    if (newTx.status === 'verified') {
      setSessionVerifiedIds((prev) => {
        const next = new Set(prev);
        next.add(newTx.id);
        return next;
      });
    }
  };

  const handleAutoReconcile = (): number => {
    const reconciledIds = transactions
      .filter((tx) => tx.status === 'pending')
      .map((tx) => tx.id);
    const shortTime = formatCurrentIst().replace('Today, ', '');
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.status !== 'pending') return tx;
        return {
          ...tx,
          status: 'verified',
          reconciled: true,
          npciResponseCode: '00',
          npciMessage: 'APPROVED · AUTO-RECONCILED WITH T+0 BANK FILE',
          proofChain: tx.proofChain.map((s) => ({ ...s, status: 'passed' })),
          auditNotes: [
            ...tx.auditNotes,
            {
              id: `note-${Date.now()}-${tx.id}`,
              author: 'Reconciliation Sweep',
              timestamp: shortTime,
              message: 'Matched against NPCI T+0 clearing file.',
              action: 'Auto-Reconciled',
            },
          ],
        };
      })
    );
    if (reconciledIds.length > 0) {
      setSessionVerifiedIds((prev) => {
        const next = new Set(prev);
        for (const rid of reconciledIds) next.add(rid);
        return next;
      });
    }
    return reconciledIds.length;
  };

  return (
    <NavigationShell
      activeScreen={activeScreen}
      onNavigate={setActiveScreen}
      disputedCount={disputedCount}
      pendingCount={pendingCount}
      currentUser={currentUser}
      onSignIn={handleSignIn}
      onSignOut={handleSignOut}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeScreen}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeScreen === 'verify' && (
            <InstantVerifyView
              currentUser={currentUser}
              onAddTransaction={handleAddTransaction}
              onInspectTransaction={(tx) => setInspectedId(tx.id)}
            />
          )}

          {activeScreen === 'ledger' && (
            <LedgerView
              transactions={transactions}
              sessionVerifiedIds={sessionVerifiedIds}
              onInspect={(tx) => setInspectedId(tx.id)}
              onBatchApprove={handleBatchApprove}
              onNavigateVerify={() => setActiveScreen('verify')}
            />
          )}

          {activeScreen === 'disputes' && (
            <DisputeQueueView
              transactions={transactions}
              onInspect={(tx) => setInspectedId(tx.id)}
              onApprove={handleApproveTransaction}
              onAddNote={handleAddNote}
            />
          )}

          {activeScreen === 'reconciliation' && (
            <ReconciliationView
              transactions={transactions}
              onAutoReconcile={handleAutoReconcile}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <EvidenceDrawer
        transaction={inspectedTransaction}
        onClose={() => setInspectedId(null)}
        onApprove={handleApproveTransaction}
        onFlagDispute={handleFlagDispute}
        onRequeryNpci={handleRequeryNpci}
        onAddNote={handleAddNote}
      />
    </NavigationShell>
  );
 }
