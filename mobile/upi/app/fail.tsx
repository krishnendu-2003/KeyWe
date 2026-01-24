import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function FailScreen() {
  const params = useLocalSearchParams();
  const { reason, amount, destination } = params as {
    reason: string;
    amount: string;
    destination: string;
  };

  const handleTryAgain = () => {
    router.push('/(tabs)/scan');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const getErrorCategory = (errorMessage: string) => {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('insufficient') || lowerError.includes('balance')) {
      return {
        category: 'Insufficient Balance',
        suggestion: 'Please ensure you have enough XLM in your account to cover the payment and transaction fees.'
      };
    }
    
    if (lowerError.includes('connection') || lowerError.includes('network')) {
      return {
        category: 'Network Error',
        suggestion: 'Please check your internet connection and try again.'
      };
    }
    
    if (lowerError.includes('rejected') || lowerError.includes('cancelled')) {
      return {
        category: 'Transaction Rejected',
        suggestion: 'The transaction was cancelled or rejected in your wallet.'
      };
    }
    
    if (lowerError.includes('timeout')) {
      return {
        category: 'Transaction Timeout',
        suggestion: 'The transaction took too long to process. Please try again.'
      };
    }
    
    return {
      category: 'Transaction Failed',
      suggestion: 'Please try again or contact support if the problem persists.'
    };
  };

  const errorInfo = getErrorCategory(reason);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.errorIcon}>
        <Text style={styles.crossmark}>❌</Text>
      </View>
      
      <Text style={styles.title}>Payment Failed</Text>
      <Text style={styles.subtitle}>{errorInfo.category}</Text>
      
      {amount && destination && (
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Transaction Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Amount:</Text>
            <Text style={styles.value}>{amount} XLM</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>To:</Text>
            <Text style={styles.value}>{formatAddress(destination)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.failedBadge}>Failed</Text>
          </View>
        </View>
      )}

      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>What went wrong?</Text>
        <Text style={styles.errorMessage}>{reason}</Text>
        
        <View style={styles.suggestionBox}>
          <Text style={styles.suggestionTitle}>💡 Suggestion</Text>
          <Text style={styles.suggestionText}>{errorInfo.suggestion}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.tryAgainButton}
        onPress={handleTryAgain}
      >
        <Text style={styles.tryAgainButtonText}>Try Again</Text>
      </TouchableOpacity>
      
      <Text style={styles.footer}>
        No funds were transferred from your account
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef2f2',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
    minHeight: '100%',
    justifyContent: 'center',
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fecaca',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  crossmark: {
    fontSize: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 30,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 15,
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
  failedBadge: {
    backgroundColor: '#fca5a5',
    color: '#991b1b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 15,
    lineHeight: 20,
  },
  suggestionBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 15,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  tryAgainButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  tryAgainButtonText: {
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