import { getActiveWorkspace } from "@/lib/auth/current";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace } = await getActiveWorkspace();
  return (
    <div className="flex min-h-screen">
      <Sidebar isSuperAdmin={user.isSuperAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar workspaceName={workspace.name} userEmail={user.email} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
