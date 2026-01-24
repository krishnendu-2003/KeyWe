'use client'

import { useState } from 'react'
import { useWallet } from '@/lib/walletContext'

export default function WalletConnect() {
  const { isConnected, publicKey, isFreighterInstalled, connect, disconnect } = useWallet()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (isConnected) {
      disconnect()
      return
    }

    setError(null)
    setLoading(true)

    try {
      await connect()
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold mb-2">Wallet Connection</h2>
          {isConnected ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connected: {publicKey?.slice(0, 8)}...{publicKey?.slice(-8)}
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isFreighterInstalled 
                ? 'Connect your wallet to start swapping'
                : 'Install Freighter wallet to connect'}
            </p>
          )}
        </div>
        <button
          onClick={handleConnect}
          disabled={loading}
          className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
            isConnected
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-stellar-primary hover:bg-purple-700 text-white'
          }`}
        >
          {loading ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect Freighter'}
        </button>
      </div>

      {!isFreighterInstalled && (
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
            Freighter wallet extension is not installed.
          </p>
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-yellow-900 dark:text-yellow-100 underline hover:no-underline font-medium"
          >
            Install Freighter →
          </a>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  )
}
