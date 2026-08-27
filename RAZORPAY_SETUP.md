# Razorpay Integration Setup

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install razorpay
```

### 2. Environment Variables
Add the following to your `backend/.env` file:
```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 3. API Endpoints
- **Create Order**: `POST /api/me/payments/create-order`
  - Body: `{ "type": "lab" | "course", "id": "item_id" }`
- **Verify Payment**: `POST /api/me/payments/verify`
  - Body: `{ "orderId": "razorpay_order_id", "paymentId": "razorpay_payment_id", "signature": "razorpay_signature", "type": "lab" | "course", "id": "item_id" }`

## Frontend Setup

### 1. Environment Variables
Add the following to your frontend `.env` file (e.g., `React.shadcn.JS-Template-main/.env`):
```env
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key_id
REACT_APP_API_BASE_URL=http://localhost:3000/api
```

### 2. Razorpay Checkout Integration Example
Here's a basic example of how to integrate Razorpay Checkout in your React component:

```jsx
import { loadRazorpay } from 'your-helper-function'; // or load the script directly

const handlePayment = async (type, id) => {
  try {
    // 1. Create order on backend
    const orderRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/me/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yourAuthToken}`,
      },
      body: JSON.stringify({ type, id }),
    });
    const orderData = await orderRes.json();

    // 2. Initialize Razorpay
    const options = {
      key: orderData.data.keyId,
      amount: orderData.data.amount,
      currency: orderData.data.currency,
      name: "Your Platform Name",
      description: `Purchase ${type}`,
      order_id: orderData.data.orderId,
      handler: async (response) => {
        // 3. Verify payment on backend
        const verifyRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/me/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${yourAuthToken}`,
          },
          body: JSON.stringify({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            type,
            id,
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          alert("Payment successful!");
          // Refresh enrollment status
        }
      },
      prefill: {
        name: "User Name",
        email: "user@example.com",
        contact: "9999999999",
      },
      theme: {
        color: "#3399cc",
      },
    };

    const rzp1 = new window.Razorpay(options);
    rzp1.open();
  } catch (error) {
    console.error("Payment failed:", error);
  }
};
```

### 3. Load Razorpay Script
Add the Razorpay script to your frontend's `index.html`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

## Getting Razorpay Credentials
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up or log in
3. Navigate to Settings → API Keys
4. Generate new test keys (for development) or live keys (for production)
5. Copy the Key ID and Key Secret
