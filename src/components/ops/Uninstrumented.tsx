import { OpsEmpty } from "@/components/ops/PageStates";

export function Uninstrumented({
  title,
  eventName,
  source,
}: {
  title: string;
  eventName: string;
  source: string;
}) {
  return (
    <OpsEmpty
      title={`${title} — not instrumented`}
      body={`This panel needs ${eventName} from ${source}. Until facts arrive, the console will not render zero.`}
    />
  );
}
