import { DemoCard, DemoPage, DemoPageBody, PageHeader } from "@/components/demo/primitives";
import TeamClient from "./team-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DemoPage>
      <PageHeader title="Manage Team" subtitle="Manage team members, roles, and access across the organization." />
      <DemoPageBody>
        <DemoCard className="p-0">
          <TeamClient />
        </DemoCard>
      </DemoPageBody>
    </DemoPage>
  );
}
