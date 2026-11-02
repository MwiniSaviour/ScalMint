import { bootstrapOwner, seedProjects } from "../src/lib/ops/bootstrap";

async function main() {
  await seedProjects();
  const result = await bootstrapOwner();
  if (result.status === "exists") {
    console.log(`OWNER already exists: ${result.email}`);
    return;
  }
  if (result.status === "seeded-password") {
    console.log(`OWNER created: ${result.email}`);
    console.warn(result.warning);
    return;
  }
  console.log(`OWNER created: ${result.email}`);
  console.log("One-time password reset token (shown once, expires in 24h):");
  console.log(result.resetToken);
  console.log(`Expires: ${result.expiresAt}`);
  console.log("Sign in at /admin/login after visiting /admin/login?reset=<token>");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
