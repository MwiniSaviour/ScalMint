import { redirect } from "next/navigation";

/** Old marketing "Log in" went nowhere. Affiliates sign in here. */
export default function LoginRedirect() {
  redirect("/affiliate/login");
}
