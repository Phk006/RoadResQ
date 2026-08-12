import { PartnerDashboard } from "@/components/partner-dashboard";

export default function PartnerPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <PartnerDashboard partnerId="partner_demo_001" partnerName="Bengaluru Roadside Fuel" />
      </div>
    </main>
  );
}
