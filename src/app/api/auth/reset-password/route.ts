import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ message: 'Token and new password are required' }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json({ message: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Find user with this token
    const [rows]: any = await db.query(
        'SELECT * FROM users WHERE reset_token = ? LIMIT 1', 
        [token]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 });
    }

    const user = rows[0];

    // Check if token is expired
    if (!user.reset_token_expiry || new Date(user.reset_token_expiry) < new Date()) {
      return NextResponse.json({ message: 'Token has expired' }, { status: 400 });
    }

    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user: clear token and set new password_hash
    await db.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
