const express = require('express');
const { body, validationResult } = require('express-validator');
const { sendContactEmail } = require('../utils/notifications');

const router = express.Router();

router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('message').trim().isLength({ min: 5 }).withMessage('Message is too short'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, message } = req.body;

    try {
      const emailResult = await sendContactEmail({
        name,
        email,
        message,
      });

      if (!emailResult.ok) {
        return res.status(502).json({
          message: 'Failed to deliver contact message',
          email: emailResult,
        });
      }

      return res.status(201).json({ message: 'Message sent successfully', email: emailResult });
    } catch (error) {
      console.error('Contact message error:', error);
      return res.status(500).json({ message: 'Server Error' });
    }
  }
);

module.exports = router;
