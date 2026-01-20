import { NextResponse } from 'next/server';
import { getMarketplaceCategories, getMarketplaceProducts } from '@/lib/marketplace/catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = getMarketplaceProducts();
    const categories = getMarketplaceCategories();

    return NextResponse.json({
      success: true,
      currency: 'USD',
      categories,
      products,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Marketplace products failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load marketplace products' },
      { status: 500 }
    );
  }
}
