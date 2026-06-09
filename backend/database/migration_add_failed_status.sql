-- Add 'failed' to order status ENUM
ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed') DEFAULT 'pending';
