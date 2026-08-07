import { PageHeader, ComingSoon } from "@/components/app/page-header";

export const metadata = { title: "İç Linkler" };

export default function InternalLinksPage() {
  return (
    <div>
      <PageHeader title="İç Linkler" description="Sitenizdeki mevcut içeriklere gerçek iç link önerileri." />
      <ComingSoon note="İç Link Motoru V1 kapsamında. Site senkronizasyonu tamamlandığında gerçek URL'lerden öneriler üretilecek." />
    </div>
  );
}
