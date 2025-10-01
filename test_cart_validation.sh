#!/bin/bash

# Test script for cart insufficient quantity validation
BASE_URL="http://localhost:8000"

echo "🛒 Testing Cart Insufficient Quantity Validation"
echo "=================================================="

# Step 1: Register test user
echo "1. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "email": "test@example.com"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
  echo "✅ User registered successfully"
  TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
else
  echo "❌ Registration failed: $REGISTER_RESPONSE"
  exit 1
fi

HEADERS="Authorization: Bearer $TOKEN"

# Step 2: Create a store
echo ""
echo "2. Creating store..."
STORE_RESPONSE=$(curl -s -X POST "$BASE_URL/users/me/store" \
  -H "Content-Type: application/json" \
  -H "$HEADERS" \
  -d '{
    "storeName": "Test Store",
    "storeDescription": "Test store for cart testing",
    "phoneNumber": "0123456789",
    "buMail": "test@bumail.net"
  }')

if echo "$STORE_RESPONSE" | grep -q "storeName"; then
  echo "✅ Store created successfully"
else
  echo "❌ Store creation failed: $STORE_RESPONSE"
  exit 1
fi

# Step 3: Create a product with limited quantity
echo ""
echo "3. Creating test product with limited quantity..."
PRODUCT_RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "$HEADERS" \
  -d '{
    "name": "Limited Product",
    "description": "A product with limited quantity for testing",
    "price": 100.0,
    "quantity": 2,
    "category": "test"
  }')

if echo "$PRODUCT_RESPONSE" | grep -q "id"; then
  PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "✅ Product created successfully: $PRODUCT_ID (Quantity: 2)"
else
  echo "❌ Product creation failed: $PRODUCT_RESPONSE"
  exit 1
fi

# Step 4: Register buyer user
echo ""
echo "4. Registering buyer user..."
BUYER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "buyer",
    "password": "buypass123",
    "email": "buyer@example.com"
  }')

if echo "$BUYER_RESPONSE" | grep -q "access_token"; then
  echo "✅ Buyer registered successfully"
  BUYER_TOKEN=$(echo "$BUYER_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
else
  echo "❌ Buyer registration failed: $BUYER_RESPONSE"
  exit 1
fi

BUYER_HEADERS="Authorization: Bearer $BUYER_TOKEN"

# Step 5: Add product to cart with valid quantity
echo ""
echo "5. Adding product to cart with valid quantity (1)..."
ADD_CART_RESPONSE=$(curl -s -X POST "$BASE_URL/cart/items" \
  -H "Content-Type: application/json" \
  -H "$BUYER_HEADERS" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 1
  }")

if echo "$ADD_CART_RESPONSE" | grep -q "id"; then
  echo "✅ Product added to cart successfully"
else
  echo "❌ Failed to add product to cart: $ADD_CART_RESPONSE"
fi

# Step 6: Try to add more than available quantity
echo ""
echo "6. Trying to add more than available quantity (3)..."
ADD_MORE_RESPONSE=$(curl -s -X POST "$BASE_URL/cart/items" \
  -H "Content-Type: application/json" \
  -H "$BUYER_HEADERS" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 3
  }")

if echo "$ADD_MORE_RESPONSE" | grep -q "Insufficient quantity"; then
  echo "✅ Insufficient quantity error caught correctly"
  echo "   Error message: $(echo "$ADD_MORE_RESPONSE" | grep -o '"detail":"[^"]*"' | cut -d'"' -f4)"
else
  echo "❌ Expected insufficient quantity error but got: $ADD_MORE_RESPONSE"
fi

# Step 7: Check current cart
echo ""
echo "7. Checking current cart..."
CART_RESPONSE=$(curl -s -X GET "$BASE_URL/cart" \
  -H "$BUYER_HEADERS")

if echo "$CART_RESPONSE" | grep -q "totalItems"; then
  TOTAL_ITEMS=$(echo "$CART_RESPONSE" | grep -o '"totalItems":[0-9]*' | cut -d':' -f2)
  echo "✅ Cart has $TOTAL_ITEMS items (should be 1)"
else
  echo "❌ Failed to get cart: $CART_RESPONSE"
fi

# Step 8: Try to update quantity to more than available
echo ""
echo "8. Getting cart item ID for update test..."
CART_ITEMS_RESPONSE=$(curl -s -X GET "$BASE_URL/cart" \
  -H "$BUYER_HEADERS")

if echo "$CART_ITEMS_RESPONSE" | grep -q '"id"'; then
  ITEM_ID=$(echo "$CART_ITEMS_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Found cart item ID: $ITEM_ID"
  
  echo ""
  echo "9. Trying to update quantity to more than available (5)..."
  UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/cart/items/$ITEM_ID" \
    -H "Content-Type: application/json" \
    -H "$BUYER_HEADERS" \
    -d '{
      "quantity": 5
    }')
  
  if echo "$UPDATE_RESPONSE" | grep -q "Insufficient quantity"; then
    echo "✅ Update insufficient quantity error caught correctly"
    echo "   Error message: $(echo "$UPDATE_RESPONSE" | grep -o '"detail":"[^"]*"' | cut -d'"' -f4)"
  else
    echo "❌ Expected insufficient quantity error but got: $UPDATE_RESPONSE"
  fi
else
  echo "❌ No cart items found"
fi

echo ""
echo "=================================================="
echo "🎉 Cart insufficient quantity validation test completed!"
