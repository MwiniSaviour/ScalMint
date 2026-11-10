"use client";

import { Button, buttonStyles } from "@/nextadmin/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/nextadmin/components/tailgrids/core/dialog";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/nextadmin/components/tailgrids/core/input-group";
import { Label } from "@/nextadmin/components/tailgrids/core/label";
import { Backdrop, OverlayWrapper } from "@/nextadmin/components/tailgrids/core/overlay";
import { TextField } from "@/nextadmin/components/tailgrids/core/text-field";
import { opsFetch } from "@/lib/ops/client-fetch";
import { cn } from "@/nextadmin/utils/cn";
import { Eye, EyeDisabled } from "@tailgrids/icons";
import { useEffect, useState } from "react";
import { FieldError, Form } from "react-aria-components";
import { toast } from "sonner";
import { securityItems } from "./data";

export default function SecurityTabContent() {
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset the form so reopening the dialog never shows the previous
  // attempt's secrets or error.
  useEffect(() => {
    if (!openPasswordDialog) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFormError(null);
    }
  }, [openPasswordDialog]);

  const submitPasswordChange = async (values: {
    currentPassword: string;
    newPassword: string;
  }) => {
    setSubmitting(true);
    const res = await opsFetch<{ ok: boolean }>("/api/admin/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);
    if (res.ok) {
      setOpenPasswordDialog(false);
      toast.success(
        "Password updated. Other signed-in devices have been signed out.",
      );
      return;
    }
    if (res.status === 0) {
      setFormError(
        "Network error — the change may not have completed. Check your connection and try again.",
      );
      return;
    }
    if (res.status === 429) {
      setFormError(
        "Too many attempts. Please wait a few minutes before trying again.",
      );
      return;
    }
    setFormError(res.error ?? "Failed to update password. Try again.");
  };

  return (
    <div>
      <h2 className="text-xl leading-7 font-semibold text-text-primary">Security</h2>

      <div className="mt-6 space-y-2 divide-y divide-card-border">
        {securityItems.map(({ icon: Icon, title, description, actionLabel }) => (
          <div
            key={title}
            className="flex flex-col gap-4 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background-gray-secondary_alt text-icon-secondary">
                <Icon />
              </div>

              <div className="min-w-0">
                <p className="text-sm leading-5 font-medium text-text-primary">{title}</p>
                <p className="mt-1 text-xs leading-4 text-text-tertiary">{description}</p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto shrink-0 rounded-none py-2 pr-0 text-base text-brand-500 hover:bg-transparent hover:text-brand-600 focus:ring-0"
              onClick={() => actionLabel.toLowerCase() === "change" && setOpenPasswordDialog(true)}
            >
              {actionLabel}
            </Button>
          </div>
        ))}
      </div>

      <OverlayWrapper isOpen={openPasswordDialog} onOpenChange={setOpenPasswordDialog}>
        <Backdrop isDismissable>
          <Dialog className="max-w-108.75 p-0">
            <Form
              onSubmit={(event) => {
                event.preventDefault();
                if (newPassword !== confirmPassword) {
                  setFormError(
                    "Passwords do not match — the confirmation must match the new password.",
                  );
                  return;
                }
                void submitPasswordChange({ currentPassword, newPassword });
              }}
            >
              <DialogHeader className="gap-1 border-b border-card-border py-4 pr-14 pl-5">
                <DialogTitle className="text-xl leading-7">Update Password</DialogTitle>
                <DialogDescription className="text-text-tertiary">
                  Choose a new password of at least 12 characters to keep your account safe
                </DialogDescription>
              </DialogHeader>

              <DialogBody className="space-y-4 px-5 py-4">
                {formError ? (
                  <p
                    role="alert"
                    className="text-sm leading-5 font-normal text-input-error"
                  >
                    {formError}
                  </p>
                ) : null}
                <TextField className="gap-1.5">
                  <Label htmlFor="current-password">Current Password</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                      required
                    />
                    <InputGroupButton
                      size="icon-sm"
                      className="mr-1"
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? (
                        <EyeDisabled className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </InputGroupButton>
                  </InputGroup>
                </TextField>

                <TextField className="gap-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Choose a new password"
                      minLength={12}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.currentTarget.value)}
                      required
                    />
                    <InputGroupButton
                      size="icon-sm"
                      className="mr-1"
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <EyeDisabled className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </InputGroupButton>
                  </InputGroup>
                  <FieldError className="text-sm font-normal text-input-error" />
                </TextField>

                <TextField className="gap-1.5">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <InputGroup>
                    <InputGroupInput
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      minLength={12}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                      required
                    />
                    <InputGroupButton
                      size="icon-sm"
                      className="mr-1"
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeDisabled className="size-5" />
                      ) : (
                        <Eye className="size-5" />
                      )}
                    </InputGroupButton>
                  </InputGroup>
                  <FieldError className="text-sm font-normal text-input-error" />
                </TextField>
              </DialogBody>

              <DialogFooter className="border-t border-card-border px-5 py-4">
                <DialogClose
                  className={cn(
                    buttonStyles({
                      appearance: "outline",
                      size: "lg",
                      className: "px-3.5 text-sm",
                    }),
                    submitting && "pointer-events-none opacity-50",
                  )}
                >
                  Cancel
                </DialogClose>
                <Button
                  type="submit"
                  size="lg"
                  className="px-3.5 text-sm"
                  isDisabled={submitting}
                >
                  {submitting ? "Updating…" : "Apply Changes"}
                </Button>
              </DialogFooter>
            </Form>
          </Dialog>
        </Backdrop>
      </OverlayWrapper>
    </div>
  );
}
