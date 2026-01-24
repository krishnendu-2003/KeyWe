'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/lib/walletContext'
import { getQuote, buildSwapTransaction, submitSwapTransaction } from '@/lib/api'
import { fetchAccountBalances, formatBalance, AssetBalance } from '@/lib/balances'
import { signTransaction } from '@stellar/freighter-api'
import * as StellarSdk from '@stellar/stellar-sdk'

export default function SwapInterface() {
  const { isConnected, publicKey } = useWallet()
  const [fromAsset, setFromAsset] = useState('USDC')
  const [toAsset, setToAsset] = useState('EURC')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balances, setBalances] = useState<AssetBalance[]>([])
  const [loadingBalances, setLoadingBalances] = useState(false)

  const assets = ['USDC', 'EURC', 'XLM']

  // Fetch balances when wallet is connected
  useEffect(() => {
    if (isConnected && publicKey) {
      setLoadingBalances(true)
      setError(null) // Clear previous errors
      console.log('Fetching balances for:', publicKey)
      fetchAccountBalances(publicKey)
        .then((fetchedBalances) => {
          console.log('Balances fetched:', fetchedBalances)
          setBalances(fetchedBalances)
        })
        .catch((err) => {
          console.error('Failed to fetch balances:', err)
          setError(`Failed to fetch balances: ${err.message}`)
          setBalances([])
        })
        .finally(() => setLoadingBalances(false))
    } else {
      setBalances([])
    }
  }, [isConnected, publicKey])

  // Get balance for selected asset
  const getBalance = (asset: string): string => {
    const balance = balances.find(b => b.asset === asset)
    return balance ? formatBalance(balance.balance) : '0.00'
  }

  // Auto-fetch quote when amount or assets change
  const fetchQuote = useCallback(async (amountValue: string) => {
    if (!amountValue || parseFloat(amountValue) <= 0 || fromAsset === toAsset) {
      setQuote(null)
      return
    }

    setLoadingQuote(true)
    setError(null)

    try {
      const result = await getQuote({
        fromAsset,
        toAsset,
        amount: (parseFloat(amountValue) * 10000000).toString(), // Convert to stroops (1 unit = 10,000,000 stroops)
        slippage: parseFloat(slippage) / 100,
        userPublicKey: publicKey || undefined
      })
      setQuote(result)
    } catch (err: any) {
      setError(err.message || 'Failed to get quote')
      setQuote(null)
    } finally {
      setLoadingQuote(false)
    }
  }, [fromAsset, toAsset, slippage])

  // Debounced quote fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount) {
        fetchQuote(amount)
      } else {
        setQuote(null)
      }
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [amount, fetchQuote])

  // Re-fetch quote when assets change
  useEffect(() => {
    if (amount && parseFloat(amount) > 0) {
      fetchQuote(amount)
    }
  }, [fromAsset, toAsset, slippage])

  const handleGetQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    await fetchQuote(amount)
  }

  const handleExecuteSwap = async () => {
    if (!isConnected || !publicKey) {
      setError('Please connect your wallet first')
      return
    }

    if (!quote) {
      setError('Please enter an amount to get a quote')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Build the transaction
      const buildResult = await buildSwapTransaction({
        route: quote.route,
        userPublicKey: publicKey,
        amountIn: quote.amountIn,
        amountOut: quote.amountOut,
        fromAsset,
        toAsset,
        slippage: parseFloat(slippage) / 100
      })

      if (!buildResult.transactionXdr) {
        throw new Error('Failed to build transaction')
      }

      // Step 2: Sign with Freighter
      const networkPassphrase = buildResult.networkPassphrase || StellarSdk.Networks.TESTNET
      
      // Sign the transaction using Freighter API
      const signedXdr = await signTransaction(buildResult.transactionXdr, {
        networkPassphrase: networkPassphrase
      })

      if (!signedXdr) {
        throw new Error('Transaction signing was cancelled')
      }

      // Step 3: Submit the signed transaction
      const result = await submitSwapTransaction(
        signedXdr,
        buildResult.networkPassphrase || StellarSdk.Networks.TESTNET
      )
      
      // Show success message
      alert(`Swap executed successfully!\nTransaction: ${result.transactionHash}\nYou will receive: ${(parseFloat(quote.amountOut) / 10000000).toFixed(7)} ${toAsset}`)
      
      // Refresh balances after swap
      if (publicKey) {
        setTimeout(() => {
          fetchAccountBalances(publicKey).then(setBalances).catch(console.error)
        }, 2000) // Wait 2 seconds for transaction to be processed
      }
      
      // Clear form
      setAmount('')
      setQuote(null)
    } catch (err: any) {
      console.error('Swap error:', err)
      setError(err.message || 'Failed to execute swap')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Swap</h2>

      {/* From Asset */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">From</label>
          {isConnected && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {loadingBalances ? (
                  'Loading...'
                ) : (
                  `Balance: ${getBalance(fromAsset)} ${fromAsset}`
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (publicKey) {
                    setLoadingBalances(true)
                    setError(null)
                    fetchAccountBalances(publicKey)
                      .then(setBalances)
                      .catch((err) => {
                        console.error('Failed to refresh balances:', err)
                        setError(`Failed to refresh balances: ${err.message}`)
                      })
                      .finally(() => setLoadingBalances(false))
                  }
                }}
                disabled={loadingBalances}
                className="text-xs px-2 py-1 text-stellar-primary hover:text-purple-700 dark:text-stellar-secondary dark:hover:text-cyan-400 disabled:opacity-50"
                title="Refresh balances"
              >
                ↻
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={fromAsset}
            onChange={(e) => setFromAsset(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
          >
            {assets.map(asset => (
              <option key={asset} value={asset}>{asset}</option>
            ))}
          </select>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
          />
        </div>
        {isConnected && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setAmount(getBalance(fromAsset))}
              className="text-xs px-2 py-1 text-stellar-primary hover:text-purple-700 dark:text-stellar-secondary dark:hover:text-cyan-400"
            >
              Max
            </button>
            <button
              type="button"
              onClick={() => setAmount((parseFloat(getBalance(fromAsset)) / 2).toString())}
              className="text-xs px-2 py-1 text-stellar-primary hover:text-purple-700 dark:text-stellar-secondary dark:hover:text-cyan-400"
            >
              Half
            </button>
          </div>
        )}
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <button
          onClick={() => {
            const temp = fromAsset
            setFromAsset(toAsset)
            setToAsset(temp)
          }}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ⇅
        </button>
      </div>

      {/* To Asset */}
      <div>
        <label className="block text-sm font-medium mb-2">To</label>
        <div className="flex gap-2">
          <select
            value={toAsset}
            onChange={(e) => setToAsset(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
          >
            {assets.map(asset => (
              <option key={asset} value={asset}>{asset}</option>
            ))}
          </select>
          <div className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center">
            {loadingQuote ? (
              <span className="text-gray-400">Calculating...</span>
            ) : quote ? (
              <span>{(parseFloat(quote.amountOut) / 10000000).toFixed(7)}</span>
            ) : (
              <span className="text-gray-400">0.0</span>
            )}
          </div>
        </div>
      </div>

      {/* Slippage */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Slippage Tolerance (%)
        </label>
        <input
          type="number"
          value={slippage}
          onChange={(e) => setSlippage(e.target.value)}
          step="0.1"
          className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Quote Details */}
      {quote && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h3 className="font-semibold mb-2">Route Details</h3>
          <div className="space-y-1 text-sm">
            <div>Price Impact: {quote.priceImpact.toFixed(2)}%</div>
            <div>Route: {quote.route.map((hop: any) => `${hop.fromAsset} → ${hop.toAsset}`).join(' → ')}</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleExecuteSwap}
          disabled={loading || loadingQuote || !isConnected || !quote || !amount || parseFloat(amount) <= 0}
          className="flex-1 px-6 py-3 bg-stellar-secondary hover:bg-cyan-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {loading ? 'Processing...' : loadingQuote ? 'Getting Quote...' : 'Swap'}
        </button>
      </div>
    </div>
  )
}
