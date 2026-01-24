# KeyWe Pay - React Native Stellar Payment App

A UPI-style payment app built on Stellar blockchain that integrates with Freighter Mobile wallet for secure, non-custodial payments.

## 🚀 Features

- **QR Code Scanning** - Scan merchant QR codes for instant payments
- **Non-Custodial** - Uses Freighter Mobile wallet for secure transaction signing
- **Stellar Integration** - Built on Stellar testnet with XLM payments
- **WalletConnect v2** - Seamless wallet connection and transaction signing
- **UPI-like UX** - Familiar payment flow for users
- **Expo Router** - Modern navigation with file-based routing

## 🏗️ Architecture

```
┌─────────────────────┐
│   KeyWe Pay App     │
│ (React Native)      │
│                     │
│  ┌─────────────┐    │
│  │ QR Scanner  │    │
│  └─────┬───────┘    │
│        ▼            │
│  Payment Parser     │
│        ▼            │
│  Tx Builder         │
│        ▼            │
│ WalletConnect v2    │──────────▶ Freighter Mobile
│        ▲            │            (User approves)
│        │            │
│ Tx Result Listener  │◀────────── Horizon
│        ▼            │
│ Success / Fail UI   │
└─────────────────────┘
```

## 📱 Screens

1. **Home Screen** - App overview and quick actions
2. **Scan Screen** - QR code scanner with camera permissions
3. **Pay Confirm Screen** - Payment details and wallet connection
4. **Success Screen** - Transaction confirmation with explorer link
5. **Fail Screen** - Error handling with helpful suggestions

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on device/simulator:
```bash
npm run android  # Android
npm run ios      # iOS
```

## 🧪 Testing

### QR Code Testing

Use the `generateTestQR()` function in `app/qr/parseQR.ts` to create test QR codes, or use the "Test Payment" button on the home screen.

### Stellar Testnet

- Network: Stellar Testnet
- Explorer: https://stellar.expert/explorer/testnet
- Friendbot: https://friendbot.stellar.org (for test XLM)

## 🔐 Security

- **Non-custodial**: App never handles private keys
- **WalletConnect**: Secure wallet communication protocol
- **Freighter Integration**: Trusted Stellar wallet for signing
- **Transaction Verification**: All transactions verified on Stellar network

## 📚 Key Dependencies

- **expo-barcode-scanner**: QR code scanning
- **@walletconnect/sign-client**: Wallet connection
- **@stellar/stellar-sdk**: Stellar blockchain integration
- **zustand**: State management
- **expo-router**: File-based navigation

## 🚧 Development Status

This is a hackathon-grade MVP focused on core payment functionality:

✅ QR Scan  
✅ WalletConnect → Freighter  
✅ XLM Testnet payment  
✅ Result handling  
✅ Explorer link  
✅ Clean UX  
✅ Expo Router integration  

## 🔮 Future Enhancements

- Multi-asset support (USDC, custom tokens)
- Mainnet support
- Payment history
- Merchant dashboard
- Push notifications
- Biometric authentication

## 📁 Project Structure

```
app/
├── (tabs)/           # Tab navigation screens
│   ├── index.tsx     # Home screen
│   ├── scan.tsx      # QR scanner
│   └── explore.tsx   # Explore/settings
├── qr/               # QR code parsing
├── store/            # State management
├── stellar/          # Blockchain integration
├── wallet/           # WalletConnect integration
├── pay-confirm.tsx   # Payment confirmation
├── success.tsx       # Success screen
├── fail.tsx          # Error screen
└── _layout.tsx       # Root layout
```

## 🔧 Configuration

### WalletConnect Project ID

Replace the project ID in `app/wallet/walletConnect.ts`:

```typescript
const WC_PROJECT_ID = 'your-project-id-here';
```

### App Configuration

Update `app.json` for production:
- App name and slug
- Bundle identifiers
- Icons and splash screens
- Permissions

## 📄 License

MIT License - Built for Stellar hackathon