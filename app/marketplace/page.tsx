import Marketplace from '../components/Marketplace';
import IntegrationBanner from '../components/IntegrationBanner';

export default function MarketplacePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-text-primary mb-2">Marketplace</h1>
        <p className="text-text-secondary">
          Browse futuristic hardware and trigger fraud detection cases
        </p>
      </div>
      <Marketplace />
      <IntegrationBanner />
    </div>
  );
}
