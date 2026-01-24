# Installation & Run Commands

Complete list of terminal commands to install and run KeyWe.

## Step 1: Install Root Dependencies

```bash
npm install
```

## Step 2: Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

## Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Step 4: Setup Backend Environment

```bash
cd backend
cp .env.example .env
# Then edit .env and add your SECRET_KEY
cd ..
```

**Edit `backend/.env` with your values:**
```bash
# Use any text editor
nano backend/.env
# or
vim backend/.env
# or
code backend/.env
```

## Step 5: Setup Frontend Environment (Optional)

```bash
cd frontend
cp .env.local.example .env.local
cd ..
```

## Step 6: Build Rust Contract (Optional)

```bash
cd contract
stellar contract build
cd ..
```

**Or use the build script:**
```bash
cd contract
chmod +x build.sh
./build.sh
cd ..
```

## Step 7: Run the Application

### Option A: Run Both Backend and Frontend Together

```bash
npm run dev
```

### Option B: Run Separately (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Complete Installation Script (Copy & Paste)

```bash
# Install all dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Setup environment files
cd backend && cp .env.example .env && cd ..
cd frontend && cp .env.local.example .env.local && cd ..

# Build contract (optional)
cd contract && stellar contract build && cd ..

# Run the application
npm run dev
```

## Individual Commands Reference

### Backend Only
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Run in development mode
npm run build        # Build for production
npm start            # Run production build
```

### Frontend Only
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Run in development mode
npm run build        # Build for production
npm start            # Run production build
npm run lint         # Run linter
```

### Contract Only
```bash
cd contract
stellar contract build    # Build contract
stellar contract test     # Run tests
stellar contract deploy  # Deploy to network
```

## Verify Installation

### Check Backend
```bash
curl http://localhost:3001/health
```

### Check Frontend
Open browser: http://localhost:3000

## Troubleshooting Commands

### Clear node_modules and reinstall
```bash
# Root
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
cd ..

# Frontend
cd frontend
rm -rf node_modules package-lock.json .next
npm install
cd ..
```

### Check versions
```bash
node --version       # Should be v18+
npm --version        # Should be v9+
rustc --version      # For contract building
stellar --version    # For contract operations
```

### Fix permissions (if needed)
```bash
chmod +x contract/build.sh
```

## Production Build Commands

```bash
# Build everything
npm run build

# Or individually
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
```
