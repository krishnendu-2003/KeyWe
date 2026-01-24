import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { usePaymentStore } from './store/paymentStore';
import { walletConnect, WalletConnectError } from './wallet/walletConnect';
import { buildPaymentTx, TxBuildError } from './stellar/buildTx';

export default function PayConfirmScreen() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const params = useLocalSearchParams();
  const { destination, amount, asset, memo } = params as {
    destination: string;
    amount: string;
    asset: string;
    memo: string;
  };
  
  const { setProcessing, walletConnected, setWalletConnected } = usePaymentStore();

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    
    try {
      await walletConnect.connect();
      setWalletConnected(true);
      Alert.alert('Success', 'Wallet connected successfully!');
    } catch (error) {
      console.error('Wallet connection error:', error);
      Alert.alert(
        'Connection Failed',
        error instanceof WalletConnectError 
          ? error.message 
          : 'Failed to connect to Freighter wallet'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePayment = async () => {
    if (!walletConnected) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    setProcessing(true);

    try {
      // Get connected account address
      const sourceAccount = walletConnect.getAccountAddress();
      if (!sourceAccount) {
        throw new Error('No account connected');
      }

      // Build transaction
      const transaction = await buildPaymentTx(
        sourceAccount,
        destination,
        amount,
        memo,
        'testnet'
      );

      // Sign and submit via WalletConnect
      const result = await walletConnect.signAndSubmitTransaction(transaction, 'testnet');
      
      if (result?.hash) {
        router.push({
          pathname: '/success',
          params: {
            hash: result.hash,
            amount,
            destination
          }
        });
      } else {
        throw new Error('Transaction failed - no hash returned');
      }

    } catch (error) {
      console.error('Payment error:', error);
      
      let errorMessage = 'Payment failed';
      if (error instanceof TxBuildError || error instanceof WalletConnectError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      router.push({
        pathname: '/fail',
        params: {
          reason: errorMessage,
          amount,
          destination
        }
      });
    } finally {
      setIsProcessing(false);
      setProcessing(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Payment Details</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Amount:</Text>
          <Text style={styles.value}>{amount} {asset}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>To:</Text>
          <Text style={styles.value}>{formatAddress(destination)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Memo:</Text>
          <Text style={styles.value}>{memo}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Network:</Text>
          <Text style={styles.networkBadge}>Testnet</Text>
        </View>
      </View>

      <View style={styles.walletSection}>
        {!walletConnected ? (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleConnectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.connectButtonText}>Connect Freighter Wallet</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.connectedIndicator}>
            <Text style={styles.connectedText}>✅ Wallet Connected</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.payButton,
          (!walletConnected || isProcessing) && styles.payButtonDisabled
        ]}
        onPress={handlePayment}
        disabled={!walletConnected || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>
            Pay {amount} {asset}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        This will open Freighter Mobile for secure transaction signing
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  networkBadge: {
    backgroundColor: '#fbbf24',
    color: '#92400e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  walletSection: {
    marginBottom: 20,
  },
  connectButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectedIndicator: {
    backgroundColor: '#10b981',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  payButton: {
    backgroundColor: '#059669',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  payButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});