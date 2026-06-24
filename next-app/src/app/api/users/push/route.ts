import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Save (or refresh) the caller's Web Push subscription so the relay can wake
// their device when a message arrives while they're offline. The payload is a
// browser PushSubscription serialised as JSON.
export async function POST(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);
    const { endpoint, keys, deviceLabel } = await req.json();

    if (
      typeof endpoint !== 'string' ||
      !endpoint ||
      !keys ||
      typeof keys.p256dh !== 'string' ||
      typeof keys.auth !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Endpoints are long-ish but bounded; reject anything absurd.
    if (endpoint.length > 1024) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const label =
      typeof deviceLabel === 'string' ? deviceLabel.slice(0, 100) : null;

    // A given browser endpoint is unique. Re-subscribing (keys rotated, or a
    // re-install) should replace the old row, not stack duplicates.
    await pool.execute(
      'DELETE FROM push_subscriptions WHERE endpoint = ?',
      [endpoint]
    );
    await pool.execute(
      `INSERT INTO push_subscriptions
         (id, user_id, endpoint, p256dh_key, auth_key, device_label)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, endpoint, keys.p256dh, keys.auth, label]
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Save push subscription error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

// Remove a subscription (user disabled notifications, or logout). Scoped to the
// caller so one user can't delete another's subscription.
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = requireAuth(req);
    const { endpoint } = await req.json();

    if (typeof endpoint !== 'string' || !endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    await pool.execute(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, endpoint]
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete push subscription error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
