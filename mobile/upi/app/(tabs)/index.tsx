import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { usePaymentStore } from '../store/paymentStore';
import { generateTestQR } from '../qr/parseQR';

export default function HomeScreen() {
  const { walletConnected, currentPayment } = usePaymentStore();

  const handleScanPayment = () => {
    router.push('/(tabs)/scan');
  };

  const handleTestPayment = () => {
    const testQR = generateTestQR();
    router.push({
      pathname: '/pay-confirm',
      params: {
        destination: 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        amount: '10',
        asset: 'XLM',
        memo: 'TEST_ORDER_123',
        callback: ''
      }
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.appName}>KeyWe Pay</Text>
        <Text style={styles.tagline}>UPI-style Stellar Payments</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Wallet Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Connection:</Text>
          <Text style={[
            styles.statusValue,
            { color: walletConnected ? '#10b981' : '#ef4444' }
          ]}>
            {walletConnected ? '✅ Connected' : '❌ Not Connected'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Network:</Text>
          <Text style={styles.networkBadge}>Stellar Testnet</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleScanPayment}
        >
          <Text style={styles.primaryButtonText}>📱 Scan QR to Pay</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleTestPayment}
        >
          <Text style={styles.secondaryButtonText}>🧪 Test Payment</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>1</Text>
          <Text style={styles.stepText}>Scan merchant QR code</Text>
        </View>
        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>2</Text>
          <Text style={styles.stepText}>Connect Freighter wallet</Text>
        </View>
        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>3</Text>
          <Text style={styles.stepText}>Approve payment securely</Text>
        </View>
        <View style={styles.stepContainer}>
          <Text style={styles.stepNumber}>4</Text>
          <Text style={styles.stepText}>Transaction confirmed on Stellar</Text>
        </View>
      </View>

      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Features</Text>
        <Text style={styles.featureItem}>🔒 Non-custodial security</Text>
        <Text style={styles.featureItem}>⚡ Instant payments</Text>
        <Text style={styles.featureItem}>🌐 Stellar blockchain</Text>
        <Text style={styles.featureItem}>📱 Mobile-first UX</Text>
      </View>

      {currentPayment && (
        <View style={styles.currentPaymentCard}>
          <Text style={styles.currentPaymentTitle}>Current Payment</Text>
          <Text style={styles.currentPaymentText}>
            {currentPayment.amount} {currentPayment.asset} to {currentPayment.destination.slice(0, 8)}...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  statusCard: {
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
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 14,
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
  actionsContainer: {
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
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
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    color: '#fff',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  featuresCard: {
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
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
  },
  featureItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    paddingLeft: 8,
  },
  currentPaymentCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 15,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  currentPaymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  currentPaymentText: {
    fontSize: 14,
    color: '#92400e',
  },
});
