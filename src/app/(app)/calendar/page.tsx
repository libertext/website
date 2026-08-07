import { PageHeader, ComingSoon } from "@/components/app/page-header";

export const metadata = { title: "Takvim" };

export default function CalendarPage() {
  return (
    <div>
      <PageHeader title="İçerik Takvimi" description="Planlanan ve yayınlanan içerikleri takvim görünümünde yönetin." />
      <ComingSoon note="İçerik takvimi V1 kapsamında geliştiriliyor. Şimdilik planlamayı makale ekranından yapabilirsiniz." />
    </div>
  );
}
