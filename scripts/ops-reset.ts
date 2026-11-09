import { opsDb as db } from "../src/lib/db";
import { createPasswordReset, supersedePendingResets } from "../src/lib/ops/password-reset";
import { writeAudit } from "../src/lib/ops/audit";

/**
 * Out-of-band password recovery for the ops console.
 *
 * Use this when nobody can sign in: first-time setup with only ADMIN_EMAIL
 * seeded, or the only OWNER has forgotten their password. It supersedes any
 * outstanding reset token for the operator, mints a fresh single-use one and
 * prints it ONCE to the terminal. From then on, the operator uses the reset
 * form at /admin/login (mode "Forgot password?") to set a 12+ character
 * password and is signed in.
 *
 * The app has no email provider, so there is no self-serve mail flow by design:
 * issuance is always a deliberate act by someone with server access (or a
 * signed-in OWNER, via Team -> Reset token). The token is printed bare rather
 * than in a ?reset= URL, so it does not end up in browser history or server
 * logs; pass it out of band to the operator, who pastes it into the form.
 */
async function main() {
  const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run ops:reset -- <email>   (or set ADMIN_EMAIL)");
    process.exit(1);
  }

  const operator = await db.opsOperator.findUnique({ where: { email } });
  if (!operator) {
    console.error(
      `No operator with email ${email}. Create one first (Team -> Add Member) or seed the owner with npm run ops:bootstrap.`,
    );
    process.exit(1);
  }
  if (operator.status !== "ACTIVE") {
    console.error(
      `Operator ${email} is ${operator.status}; re-enable it in Team before resetting.`,
    );
    process.exit(1);
  }

  const resetToken = await db.$transaction(async (tx) => {
    await supersedePendingResets(tx, operator.id);
    const { token } = await createPasswordReset(tx, operator.id);
    await tx.opsOperator.update({
      where: { id: operator.id },
      data: { sessionVersion: { increment: 1 } },
    });
    await writeAudit(tx, {
      actorType: "SYSTEM",
      actorId: "ops-reset",
      action: "operator.reset",
      targetType: "OpsOperator",
      targetId: operator.id,
      meta: {
        email,
        via: "cli",
        osUser: process.env.USER ?? process.env.USERNAME ?? null,
      },
    });
    return token;
  });

  console.log(`Reset issued for ${email}`);
  console.log("One-time password reset token (shown once, expires in 24h):");
  console.log(resetToken);
  console.log(
    "Hand this token to the operator (out of band). They open /admin/login, choose \"Forgot password?\" and set a 12+ character password.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
