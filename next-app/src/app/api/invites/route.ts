import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendInviteEmail } from '@/lib/mailer';
import { logger } from '@/lib/logger';
import { INVITE_DAILY_LIMIT, INVITE_TOTAL_LIMIT } from '@/lib/limits';

export async function POST(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Fetch inviter data first — needed for self-invite check and email body
    const [selfRows] = await pool.execute(
      'SELECT email FROM users WHERE id = ?',
      [userId]
    );
    const inviterEmail = (selfRows as any[])[0]?.email as string;

    // Reject self-invite (compare using DB-canonical email to avoid casing issues)
    if (inviterEmail.toLowerCase() === normalizedEmail) {
      return NextResponse.json(
        { error: 'You cannot invite yourself.' },
        { status: 400 }
      );
    }

    // Reject if the address belongs to any existing user (verified or not)
    const [existing] = await pool.execute(
      'SELECT id, verified FROM users WHERE LOWER(email) = ?',
      [normalizedEmail]
    );
    const existingUser = (existing as any[])[0];
    if (existingUser) {
      if (existingUser.verified) {
        return NextResponse.json(
          { error: 'This person already has an account — search for them directly.' },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          { error: 'This email address has a pending registration. They may need to verify their email first.' },
          { status: 409 }
        );
      }
    }

    // Reject duplicate invite from the same inviter to the same address
    const [dupe] = await pool.execute(
      'SELECT id FROM invites WHERE inviter_id = ? AND email = ?',
      [userId, normalizedEmail]
    );
    if ((dupe as any[]).length > 0) {
      return NextResponse.json(
        { error: 'You have already sent an invite to this address.' },
        { status: 409 }
      );
    }

    // Enforce total invite cap (10 ever)
    const [totalRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM invites WHERE inviter_id = ?',
      [userId]
    );
    if ((totalRows as any[])[0].cnt >= INVITE_TOTAL_LIMIT) {
      return NextResponse.json(
        { error: `You have reached your invite limit of ${INVITE_TOTAL_LIMIT}.` },
        { status: 429 }
      );
    }

    // Enforce daily cap (3 per day)
    const [dailyRows] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM invites
       WHERE inviter_id = ? AND sent_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      [userId]
    );
    if ((dailyRows as any[])[0].cnt >= INVITE_DAILY_LIMIT) {
      return NextResponse.json(
        { error: `You can send up to ${INVITE_DAILY_LIMIT} invites per day. Try again tomorrow.` },
        { status: 429 }
      );
    }

    // Persist invite and send email
    const id    = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    await pool.execute(
      'INSERT INTO invites (id, inviter_id, email, token) VALUES (?, ?, ?, ?)',
      [id, userId, normalizedEmail, token]
    );

    await sendInviteEmail(inviterEmail, normalizedEmail, token);

    return NextResponse.json({ ok: true }, { status: 201 });

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logger.error('Invite error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
