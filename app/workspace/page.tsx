import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WorkspaceOverview } from "@/components/workspace/workspace-overview";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { readMailConnectorCookie } from "@/lib/mail-connector-cookie";
import { workspaceMetrics } from "@/lib/workspace-content";

export default async function WorkspacePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const mailboxConfig = await readMailConnectorCookie();

  const headerMetric = workspaceMetrics[2];

  return (
    <WorkspaceShell title="工作台" label="Workspace" headerMetric={{ label: headerMetric.label, value: headerMetric.value }}>
      <WorkspaceOverview email={session.user.email} mailboxConfig={mailboxConfig} />
    </WorkspaceShell>
  );
}
