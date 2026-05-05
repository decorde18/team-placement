import { NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const [rows]: any = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) {
      // Return 200 even if not found to prevent email enumeration attacks
      return NextResponse.json({ message: 'If that email is in our system, we have sent a reset link to it.' }, { status: 200 });
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Token expires in 1 hour
    const tokenExpiry = new Date(Date.now() + 3600000); 

    // Calculate proper MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
    const formattedExpiry = tokenExpiry.toISOString().slice(0, 19).replace('T', ' ');

    // Store token in database
    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
      [resetToken, formattedExpiry, email]
    );

    // Send the email
    const emailResponse = await sendPasswordResetEmail(email, resetToken);
    
    if (!emailResponse.success) {
       return NextResponse.json({ message: 'Failed to send reset email. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'If that email is in our system, we have sent a reset link to it.' }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
