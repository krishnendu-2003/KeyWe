import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function SuccessScreen() {
  const params = useLocalSearchParams();
  const { hash, amount, destination } = params as {
    hash: string;
    amount: string;
    destination: string;
  };

  const handleViewOnExplorer = async () => {
    const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${hash}`;
    
    try {
      const supported = await Linking.canOpenURL(explorerUrl);
      if (supported) {
        await Linking.openURL(explorerUrl);
      } else {
        Alert.alert('Error', 'Cannot open browser');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open explorer');
    }
  };

  const handleNewPayment = () => {
    router.push('/(tabs)/scan');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatHash = (txHash: string) => {
    return `${txHash.slice(0, 8)}...${txHash.slice(-8)}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.successIcon}>
        <Text style={styles.checkmark}>✅</Text>
      </View>
      
      <Text style={styles.title}>Payment Successful!</Text>
      <Text style={styles.subtitle}>Your transaction has been confirmed</Text>
      
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Amount Sent:</Text>
          <Text style={styles.value}>{amount} XLM</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>To:</Text>
          <Text style={styles.value}>{formatAddress(destination)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Transaction:</Text>
          <Text style={styles.value}>{formatHash(hash)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>Network:</Text>
          <Text style={styles.networkBadge}>Testnet</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.explorerButton}
        onPress={handleViewOnExplorer}
      >
        <Text style={styles.explorerButtonText}>View on Stellar Explorer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.newPaymentButton}
        onPress={handleNewPayment}
      >
        <Text style={styles.newPaymentButtonText}>Make Another Payment</Text>
      </TouchableOpacity>
      
      <Text style={styles.footer}>
        Transaction confirmed on Stellar Testnet
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  checkmark: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#16a34a',
    marginBottom: 30,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: 'bold',
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
  explorerButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  explorerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  newPaymentButton: {
    backgroundColor: '#10b981',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  newPaymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});