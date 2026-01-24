// 'use client'

// import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// interface WalletContextType {
//   isConnected: boolean
//   publicKey: string | null
//   isFreighterInstalled: boolean
//   connect: () => Promise<void>
//   disconnect: () => void
// }

// const WalletContext = createContext<WalletContextType | undefined>(undefined)

// // Check if Freighter is installed
// function isFreighterAvailable(): boolean {
//   if (typeof window === 'undefined') return false
  
//   // Check multiple possible ways Freighter might expose its API
//   return !!(
//     (window as any).freighterApi ||
//     (window as any).freighter ||
//     (window as any).stellar?.freighter
//   )
// }

// // Get Freighter API
// function getFreighterApi(): any {
//   if (typeof window === 'undefined') return null
  
//   return (
//     (window as any).freighterApi ||
//     (window as any).freighter ||
//     (window as any).stellar?.freighter ||
//     null
//   )
// }

// export function WalletProvider({ children }: { children: ReactNode }) {
//   const [isConnected, setIsConnected] = useState(false)
//   const [publicKey, setPublicKey] = useState<string | null>(null)
//   const [isFreighterInstalled, setIsFreighterInstalled] = useState(false)

//   useEffect(() => {
//     // Check if Freighter is installed
//     const checkFreighter = () => {
//       const installed = isFreighterAvailable()
//       setIsFreighterInstalled(installed)

//       if (installed) {
//         // Try to get existing connection
//         const freighter = getFreighterApi()
//         if (freighter && freighter.isConnected) {
//           freighter.isConnected()
//             .then((connected: boolean) => {
//               if (connected && freighter.getPublicKey) {
//                 return freighter.getPublicKey()
//               }
//               return null
//             })
//             .then((key: string | null) => {
//               if (key) {
//                 setPublicKey(key)
//                 setIsConnected(true)
//               }
//             })
//             .catch((error: any) => {
//               console.error('Freighter check failed:', error)
//             })
//         }
//       }
//     }

//     checkFreighter()

//     // Check periodically in case Freighter is installed after page load
//     const interval = setInterval(checkFreighter, 2000)
//     return () => clearInterval(interval)
//   }, [])

//   const connect = async () => {
//     try {
//       // Check if Freighter is available
//       if (!isFreighterAvailable()) {
//         const install = confirm(
//           'Freighter wallet extension is not installed. Would you like to install it now?'
//         )
//         if (install) {
//           window.open('https://freighter.app', '_blank')
//         }
//         return
//       }

//       const freighter = getFreighterApi()
      
//       if (!freighter) {
//         throw new Error('Freighter API not available')
//       }

//       // Try to get public key (this will prompt user if not connected)
//       let publicKey: string | null = null

//       if (freighter.getPublicKey) {
//         publicKey = await freighter.getPublicKey()
//       } else if (freighter.connect) {
//         // Alternative connection method
//         await freighter.connect()
//         publicKey = await freighter.getPublicKey()
//       } else {
//         throw new Error('Freighter API methods not available')
//       }
      
//       if (!publicKey) {
//         throw new Error('Failed to get public key from Freighter')
//       }

//       setPublicKey(publicKey)
//       setIsConnected(true)
//     } catch (error: any) {
//       console.error('Connection failed:', error)
//       // Don't show alert, let the UI handle it
//       throw error
//     }
//   }

//   const disconnect = () => {
//     setPublicKey(null)
//     setIsConnected(false)
//   }

//   return (
//     <WalletContext.Provider value={{ 
//       isConnected, 
//       publicKey, 
//       isFreighterInstalled,
//       connect, 
//       disconnect 
//     }}>
//       {children}
//     </WalletContext.Provider>
//   )
// }

// export function useWallet() {
//   const context = useContext(WalletContext)
//   if (context === undefined) {
//     throw new Error('useWallet must be used within a WalletProvider')
//   }
//   return context
// }




'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  isAllowed,
  setAllowed,
  getPublicKey,
} from '@stellar/freighter-api'

interface WalletContextType {
  isConnected: boolean
  publicKey: string | null
  isFreighterInstalled: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(false)

  // Detect Freighter installation
  useEffect(() => {
    const detectFreighter = async () => {
      try {
        await isAllowed()
        setIsFreighterInstalled(true)
      } catch {
        setIsFreighterInstalled(false)
      }
    }

    detectFreighter()
  }, [])

  const connect = async () => {
    // 1. Ask permission if not already granted
    const allowed = await isAllowed()
    if (!allowed) {
      const approved = await setAllowed()
      if (!approved) {
        throw new Error('User rejected Freighter access')
      }
    }

    // 2. Get public key (this connects the wallet)
    const pk = await getPublicKey()
    if (!pk) {
      throw new Error('Failed to retrieve public key')
    }

    setPublicKey(pk)
  }

  const disconnect = () => {
    // Freighter does not support programmatic disconnect
    // This is app-level disconnect only
    setPublicKey(null)
  }

  return (
    <WalletContext.Provider
      value={{
        isConnected: !!publicKey,
        publicKey,
        isFreighterInstalled,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}
