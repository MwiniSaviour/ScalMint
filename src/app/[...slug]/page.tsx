import { notFound } from "next/navigation";

/** Unknown paths 404. Marketing routes now have real pages. */
export default function CatchAll() {
  notFound();
}
