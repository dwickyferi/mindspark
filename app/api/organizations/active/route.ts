import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUserActiveOrganization } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeOrganization = await getUserActiveOrganization({
      userId: session.user.id,
    });
    
    return NextResponse.json({
      activeOrganizationId: activeOrganization?.id || null,
    });
  } catch (error) {
    console.error('Error fetching active organization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
