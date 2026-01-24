export interface AssetBalance {
  asset: string
  balance: string
  code: string
  issuer?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function fetchAccountBalances(
  publicKey: string
): Promise<AssetBalance[]> {
  try {
    console.log(`Fetching balances for account: ${publicKey}`)
    
    const response = await fetch(`${API_URL}/balance/${publicKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch balances')
    }

    const balances = await response.json()
    console.log('Fetched balances:', balances)
    return balances
  } catch (error: any) {
    console.error('Error fetching balances:', error)
    // Return zero balances on error
    return [
      { asset: 'XLM', balance: '0.0000000', code: 'XLM' },
      { asset: 'USDC', balance: '0.0000000', code: 'USDC' },
      { asset: 'EURC', balance: '0.0000000', code: 'EURC' },
    ]
  }
}

export function formatBalance(balance: string): string {
  const num = parseFloat(balance)
  if (num === 0) return '0.00'
  if (num < 0.01) return num.toFixed(7)
  if (num < 1) return num.toFixed(4)
  return num.toFixed(2)
}
