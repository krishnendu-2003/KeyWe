'use client'

import { useMemo, useState } from 'react'
import { signTransaction } from '@stellar/freighter-api'
import * as StellarSdk from '@stellar/stellar-sdk'
import { useWallet } from '@/lib/walletContext'
import { attachSignedPendingSwap, createPendingSwap, submitSwapTransaction } from '@/lib/api'

export default function PostmanXdrSigner() {
  const { isConnected, publicKey, connect, isFreighterInstalled } = useWallet()

  const [unsignedXdr, setUnsignedXdr] = useState('')
  const [networkPassphrase, setNetworkPassphrase] = useState<string>(StellarSdk.Networks.TESTNET)
  const [postmanControlsSubmit, setPostmanControlsSubmit] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signedXdr, setSignedXdr] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return unsignedXdr.trim().length > 0 && networkPassphrase.trim().length > 0
  }, [unsignedXdr, networkPassphrase])

  const parsedTx = useMemo(() => {
    const xdr = unsignedXdr.trim()
    if (!xdr) return { ok: false as const, error: 'Paste an XDR to inspect it.' }
    try {
      const tx = StellarSdk.TransactionBuilder.fromXDR(xdr, networkPassphrase)
      return {
        ok: true as const,
        source: tx.source,
        sequence: tx.sequence,
      }
    } catch (e: any) {
      return { ok: false as const, error: e?.message || 'Failed to parse XDR (check network passphrase).' }
    }
  }, [unsignedXdr, networkPassphrase])

  const sourceMismatch =
    parsedTx.ok && !!publicKey && parsedTx.source !== publicKey

  const handleSignAndSubmit = async () => {
    setError(null)
    setSignedXdr(null)
    setTxHash(null)
    setPendingId(null)

    if (!isFreighterInstalled) {
      setError('Freighter is not installed')
      return
    }

    if (!isConnected) {
      await connect()
    }

    if (!canSubmit) {
      setError('Paste an unsignedTransactionXdr and network passphrase first')
      return
    }

    // Most common cause of tx_bad_auth:
    // XDR was built for a different source account than the connected wallet.
    if (sourceMismatch) {
      setError(
        `XDR source account mismatch. This XDR was built for ${parsedTx.ok ? parsedTx.source : 'unknown'}, but Freighter is connected to ${publicKey}. Rebuild the XDR in Postman using userPublicKey=${publicKey}.`
      )
      return
    }

    setLoading(true)
    try {
      const xdrToSign = unsignedXdr.trim()
      let createdId: string | null = null
      if (postmanControlsSubmit) {
        const created = await createPendingSwap(xdrToSign, networkPassphrase)
        createdId = created?.id || null
        setPendingId(createdId)
        console.log('[PendingSwap] Created', { id: createdId })
      }

      console.log('[Freighter] Signature requested (popup should open)', {
        flow: 'postman-xdr-signer',
        publicKey,
        networkPassphrase,
        xdrSource: parsedTx.ok ? parsedTx.source : undefined,
        xdrSequence: parsedTx.ok ? parsedTx.sequence : undefined,
      })
      const signed = await signTransaction(xdrToSign, { networkPassphrase })
      if (!signed) {
        console.log('[Freighter] User cancelled signing (no signed XDR returned)', {
          flow: 'postman-xdr-signer',
          publicKey,
        })
        throw new Error('Signing was cancelled')
      }

      console.log('[Freighter] User confirmed signing (signed XDR returned)', {
        flow: 'postman-xdr-signer',
        publicKey,
      })
      setSignedXdr(signed)

      if (postmanControlsSubmit) {
        if (!createdId) throw new Error('Failed to create pending request id')
        await attachSignedPendingSwap(createdId, signed)
        console.log('[PendingSwap] Signed XDR attached. Now confirm/cancel from Postman.', { id: createdId })
      } else {
        const res = await submitSwapTransaction(signed, networkPassphrase)
        setTxHash(res?.transactionHash || null)
      }
    } catch (e: any) {
      console.log('[Freighter] Signing rejected/cancelled (error)', {
        flow: 'postman-xdr-signer',
        publicKey,
        message: e?.message,
      })
      setError(e?.message || 'Failed to sign/submit transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Postman → Freighter → Execute</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            1) Build unsigned XDR in Postman via <code>/api/swap/build</code> 2) Paste it here 3) Freighter will pop up to
            sign 4) Backend submits via <code>/api/swap/execute</code>.
          </p>
          {publicKey && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Connected wallet: <code>{publicKey}</code>
            </p>
          )}
          {parsedTx.ok && (
            <p className={`mt-1 text-xs ${sourceMismatch ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}`}>
              XDR source account: <code>{parsedTx.source}</code> (seq <code>{parsedTx.sequence}</code>)
            </p>
          )}
          {!parsedTx.ok && unsignedXdr.trim() && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">
              XDR parse error: {parsedTx.error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSignAndSubmit}
          disabled={loading || !canSubmit || sourceMismatch || !parsedTx.ok}
          className="px-4 py-2 rounded-lg font-medium bg-stellar-primary hover:bg-purple-700 text-white disabled:opacity-50"
        >
          {loading ? 'Working…' : 'Sign & Execute'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm font-medium">Unsigned transaction XDR (from Postman)</label>
        <textarea
          value={unsignedXdr}
          onChange={(e) => setUnsignedXdr(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 font-mono text-xs"
          placeholder="Paste buildSwapTransaction.transactionXdr here…"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="postmanControlsSubmit"
          type="checkbox"
          checked={postmanControlsSubmit}
          onChange={(e) => setPostmanControlsSubmit(e.target.checked)}
        />
        <label htmlFor="postmanControlsSubmit" className="text-sm text-gray-700 dark:text-gray-300">
          Let Postman control confirm/cancel of submission (creates a pending request)
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label className="text-sm font-medium">Network passphrase</label>
        <input
          value={networkPassphrase}
          onChange={(e) => setNetworkPassphrase(e.target.value)}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 font-mono text-xs"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          For testnet: <code>{StellarSdk.Networks.TESTNET}</code>
        </p>
      </div>

      {txHash && (
        <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <p className="text-sm text-green-800 dark:text-green-200">
            Executed. Tx hash: <code>{txHash}</code>
          </p>
        </div>
      )}

      {pendingId && postmanControlsSubmit && (
        <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            Pending request created: <code>{pendingId}</code>
          </p>
          <p className="mt-1 text-xs text-purple-800 dark:text-purple-200">
            Now in Postman:
            <br />
            <code>POST /api/swap/pending/{pendingId}/confirm</code> to submit
            <br />
            <code>POST /api/swap/pending/{pendingId}/cancel</code> to cancel
          </p>
        </div>
      )}

      {signedXdr && !txHash && (
        <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Signed XDR obtained{postmanControlsSubmit ? '. Waiting for Postman confirm…' : '. Submitting…'}
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  )
}

