'use client'

import { useState, useEffect } from 'react'
import SwapInterface from '@/components/SwapInterface'
import WalletConnect from '@/components/WalletConnect'
import { WalletProvider } from '@/lib/walletContext'

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  return (
    <WalletProvider>
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-stellar-primary to-stellar-secondary bg-clip-text text-transparent">
              KeyWe
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Stellar Swap Aggregator - Find the best routes across all DEXs
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
            <WalletConnect />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <SwapInterface />
          </div>
        </div>
      </main>
    </WalletProvider>
  )
}
