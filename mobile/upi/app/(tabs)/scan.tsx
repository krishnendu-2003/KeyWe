import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { parsePaymentQR, QRParseError, generateTestQR } from '../qr/parseQR';
import { usePaymentStore } from '../store/paymentStore';

export default function ScanScreen() {
  const [scanned, setScanned] = useState(false);
  const setPayment = usePaymentStore(state => state.setPayment);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    console.log('QR Code scanned:', { type, data });
    setScanned(true);
    
    try {
      const paymentData = parsePaymentQR(data);
      console.log('Parsed payment data:', paymentData);
      setPayment(paymentData);
      
      router.push({
        pathname: '/pay-confirm',
        params: {
          destination: paymentData.destination,
          amount: paymentData.amount,
          asset: paymentData.asset,
          memo: paymentData.memo,
          callback: paymentData.callback || ''
        }
      });
    } catch (error) {
      console.error('QR parsing error:', error);
      if (error instanceof QRParseError) {
        Alert.alert('Invalid QR Code', error.message, [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
      } else {
        Alert.alert('Error', 'Failed to process QR code', [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
      }
    }
  };

  const handleTestQR = () => {
    console.log('Testing with generated QR');
    const testQR = generateTestQR();
    handleBarCodeScanned({ type: 'test', data: testQR });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.scanArea} />
        
        <Text style={styles.title}>QR Code Scanner</Text>
        <Text style={styles.instructionText}>
          Camera scanning requires a development build.{'\n'}
          Use the test button below to try the payment flow.
        </Text>
        
        <Text style={styles.debugText}>
          Platform: {Platform.OS}
        </Text>
        
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestQR}
        >
          <Text style={styles.testButtonText}>🧪 Test with Sample QR</Text>
        </TouchableOpacity>
        
        <Text style={styles.noteText}>
          For real QR scanning, build a development client:{'\n'}
          npx expo run:android or npx expo run:ios
        </Text>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const scanAreaSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scanArea: {
    width: scanAreaSize,
    height: scanAreaSize,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 20,
    backgroundColor: 'transparent',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  debugText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 30,
  },
  testButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 25,
    marginBottom: 20,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noteText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});