# KeyWe Pay Setup Guide

## Quick Start

1. **Install Dependencies**
```bash
npm install
```

2. **Start Development Server**
```bash
npm start
```

3. **Run on Device**
```bash
# Android
npm run android

# iOS  
npm run ios
```

## Required Permissions

The app requires camera permission for QR code scanning. This is configured in `app.json`:

```json
{
  "android": {
    "permissions": [
      "android.permission.CAMERA"
    ]
  }
}
```

## WalletConnect Configuration

1. Get a project ID from [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Replace the project ID in `app/wallet/walletConnect.ts`:

```typescript
const WC_PROJECT_ID = 'your-project-id-here';
```

## Testing

### Test QR Codes

Use the "Test Payment" button on the home screen or generate QR codes using:

```typescript
import { generateTestQR } from './app/qr/parseQR';
const testQR = generateTestQR();
```

### Freighter Mobile Setup

1. Install Freighter Mobile wallet
2. Create/import a Stellar testnet account
3. Fund account with test XLM from [Friendbot](https://friendbot.stellar.org)

## Troubleshooting

### Camera Permission Issues
- Ensure camera permission is granted in device settings
- Check that `expo-barcode-scanner` is properly installed

### WalletConnect Issues
- Verify project ID is correct
- Check network connectivity
- Ensure Freighter Mobile supports WalletConnect

### Transaction Failures
- Check account has sufficient XLM balance
- Verify destination address is valid
- Ensure network (testnet) matches wallet

## Production Checklist

- [ ] Replace WalletConnect Project ID
- [ ] Add production app icons
- [ ] Configure app signing certificates
- [ ] Test on physical devices
- [ ] Update app store metadata
- [ ] Configure deep linking
- [ ] Add error tracking (Sentry)
- [ ] Performance monitoring

## File Structure

```
mobile/upi/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx      # Home screen
│   │   ├── scan.tsx       # QR scanner
│   │   └── explore.tsx    # Explore tab
│   ├── qr/
│   │   └── parseQR.ts     # QR parsing logic
│   ├── store/
│   │   └── paymentStore.ts # State management
│   ├── stellar/
│   │   └── buildTx.ts     # Transaction building
│   ├── wallet/
│   │   └── walletConnect.ts # WalletConnect integration
│   ├── pay-confirm.tsx    # Payment confirmation
│   ├── success.tsx        # Success screen
│   ├── fail.tsx          # Error screen
│   └── _layout.tsx       # Root layout
├── assets/               # App assets
├── components/           # Reusable components
├── constants/           # App constants
├── hooks/              # Custom hooks
├── app.json            # Expo configuration
├── package.json        # Dependencies
└── README.md          # Documentation
```