const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// @desc    Create payment intent for order
// @route   POST /api/payment/create-intent
// @access  Private
router.post('/create-intent', [
  protect,
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('items.*.type').isIn(['pet', 'product']).withMessage('Item type must be pet or product'),
  body('items.*.id').isInt({ min: 1 }).withMessage('Item ID must be a positive integer'),
  body('items.*.quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('shippingAddress').trim().isLength({ min: 10 }).withMessage('Shipping address is required'),
  body('billingAddress').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { items, shippingAddress, billingAddress, notes } = req.body;
    const userId = req.user.id;
    const db = getDatabase();

    let totalAmount = 0;
    const orderItems = [];

    // Validate items and calculate total
    for (const item of items) {
      const { type, id, quantity = 1 } = item;

      if (type === 'pet') {
        db.get(
          'SELECT id, name, price, is_available FROM pets WHERE id = ?',
          [id],
          (err, pet) => {
            if (err) {
              return res.status(500).json({
                success: false,
                message: 'Database error'
              });
            }

            if (!pet) {
              return res.status(400).json({
                success: false,
                message: `Pet with ID ${id} not found`
              });
            }

            if (!pet.is_available) {
              return res.status(400).json({
                success: false,
                message: `Pet "${pet.name}" is not available`
              });
            }

            totalAmount += pet.price * quantity;
            orderItems.push({
              type: 'pet',
              id: pet.id,
              name: pet.name,
              price: pet.price,
              quantity
            });
          }
        );
      } else if (type === 'product') {
        db.get(
          'SELECT id, name, price, stock_quantity, is_available FROM shop_products WHERE id = ?',
          [id],
          (err, product) => {
            if (err) {
              return res.status(500).json({
                success: false,
                message: 'Database error'
              });
            }

            if (!product) {
              return res.status(400).json({
                success: false,
                message: `Product with ID ${id} not found`
              });
            }

            if (!product.is_available || product.stock_quantity < quantity) {
              return res.status(400).json({
                success: false,
                message: `Product "${product.name}" is not available in sufficient quantity`
              });
            }

            totalAmount += product.price * quantity;
            orderItems.push({
              type: 'product',
              id: product.id,
              name: product.name,
              price: product.price,
              quantity
            });
          }
        );
      }
    }

    // Wait for all database queries to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    if (totalAmount === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid items found'
      });
    }

    // Create order
    const orderNumber = `ORD-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    db.run(
      `INSERT INTO orders (user_id, order_number, total_amount, shipping_address, billing_address, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, orderNumber, totalAmount, shippingAddress, billingAddress || shippingAddress, notes],
      function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error creating order'
          });
        }

        const orderId = this.lastID;

        // Insert order items
        const insertOrderItems = () => {
          const promises = orderItems.map(item => {
            return new Promise((resolve, reject) => {
              db.run(
                'INSERT INTO order_items (order_id, item_type, item_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.type, item.id, item.quantity, item.price],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          });

          Promise.all(promises)
            .then(() => {
              // Create Stripe payment intent
              stripe.paymentIntents.create({
                amount: Math.round(totalAmount * 100), // Convert to cents
                currency: 'inr',
                metadata: {
                  orderId: orderId.toString(),
                  orderNumber: orderNumber,
                  userId: userId.toString()
                },
                description: `Order ${orderNumber} - Sharma's Pet Nation`
              })
                .then(paymentIntent => {
                  // Save payment record
                  db.run(
                    'INSERT INTO payments (order_id, stripe_payment_intent_id, amount, status) VALUES (?, ?, ?, ?)',
                    [orderId, paymentIntent.id, totalAmount, 'pending'],
                    (err) => {
                      if (err) {
                        console.error('Error saving payment record:', err);
                      }
                    }
                  );

                  res.json({
                    success: true,
                    data: {
                      clientSecret: paymentIntent.client_secret,
                      orderId: orderId,
                      orderNumber: orderNumber,
                      totalAmount: totalAmount
                    }
                  });
                })
                .catch(stripeError => {
                  console.error('Stripe error:', stripeError);
                  res.status(500).json({
                    success: false,
                    message: 'Error creating payment intent'
                  });
                });
            })
            .catch(err => {
              console.error('Error inserting order items:', err);
              res.status(500).json({
                success: false,
                message: 'Error processing order items'
              });
            });
        };

        insertOrderItems();
      }
    );
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Confirm payment and update order status
// @route   POST /api/payment/confirm
// @access  Private
router.post('/confirm', [
  protect,
  body('paymentIntentId').trim().notEmpty().withMessage('Payment intent ID is required'),
  body('orderId').isInt({ min: 1 }).withMessage('Valid order ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { paymentIntentId, orderId } = req.body;
    const userId = req.user.id;
    const db = getDatabase();

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    // Verify order belongs to user
    db.get(
      'SELECT id, user_id, status FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId],
      async (err, order) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

        if (order.status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: 'Order already processed'
          });
        }

        // Update order status
        db.run(
          'UPDATE orders SET status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['confirmed', 'paid', orderId],
          function(err) {
            if (err) {
              return res.status(500).json({
                success: false,
                message: 'Error updating order status'
              });
            }

            // Update payment record
            db.run(
              `UPDATE payments SET status = ?, payment_method = ?, transaction_id = ?, updated_at = CURRENT_TIMESTAMP 
               WHERE order_id = ? AND stripe_payment_intent_id = ?`,
              ['completed', paymentIntent.payment_method, paymentIntent.id, orderId, paymentIntentId],
              (err) => {
                if (err) {
                  console.error('Error updating payment record:', err);
                }
              }
            );

            // Update stock quantities for products
            db.all(
              'SELECT item_type, item_id, quantity FROM order_items WHERE order_id = ?',
              [orderId],
              (err, orderItems) => {
                if (err) {
                  console.error('Error fetching order items:', err);
                  return;
                }

                orderItems.forEach(item => {
                  if (item.item_type === 'product') {
                    db.run(
                      'UPDATE shop_products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                      [item.quantity, item.item_id],
                      (err) => {
                        if (err) {
                          console.error('Error updating stock:', err);
                        }
                      }
                    );
                  } else if (item.item_type === 'pet') {
                    db.run(
                      'UPDATE pets SET is_available = 0 WHERE id = ?',
                      [item.item_id],
                      (err) => {
                        if (err) {
                          console.error('Error updating pet availability:', err);
                        }
                      }
                    );
                  }
                });
              }
            );

            res.json({
              success: true,
              message: 'Payment confirmed successfully'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Handle Stripe webhook
// @route   POST /api/payment/webhook
// @access  Public (Stripe)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = getDatabase();

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Update payment status in database
      db.run(
        'UPDATE payments SET status = ? WHERE stripe_payment_intent_id = ?',
        ['completed', paymentIntent.id],
        (err) => {
          if (err) {
            console.error('Error updating payment status:', err);
          }
        }
      );
      
      console.log('PaymentIntent was successful!');
      break;
    
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      
      // Update payment status in database
      db.run(
        'UPDATE payments SET status = ? WHERE stripe_payment_intent_id = ?',
        ['failed', failedPayment.id],
        (err) => {
          if (err) {
            console.error('Error updating payment status:', err);
          }
        }
      );
      
      console.log('PaymentIntent failed!');
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// @desc    Get payment history for user
// @route   GET /api/payment/history
// @access  Private
router.get('/history', protect, (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDatabase();

    db.all(
      `SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.created_at,
              p.status as payment_status_detail, p.payment_method, p.transaction_id
       FROM orders o
       LEFT JOIN payments p ON o.id = p.order_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId],
      (err, orders) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: orders
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
