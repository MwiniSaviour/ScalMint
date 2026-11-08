"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/nextadmin/components/tailgrids/core/avatar";
import { Button } from "@/nextadmin/components/tailgrids/core/button";
import { Card } from "@/nextadmin/components/tailgrids/core/card";
import { Input } from "@/nextadmin/components/tailgrids/core/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/nextadmin/components/tailgrids/core/input-group";
import { Label } from "@/nextadmin/components/tailgrids/core/label";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/nextadmin/components/tailgrids/core/select";
import { TextArea } from "@/nextadmin/components/tailgrids/core/text-area";
import { TextField } from "@/nextadmin/components/tailgrids/core/text-field";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FieldError, Form } from "react-aria-components";
import { opsFetch } from "@/lib/ops/client-fetch";
import { LogoutIcon, TrashIcon } from "./icons";

const countryOptions = [
  { value: "us", label: "United States", flag: "/images/flag/US.svg" },
  { value: "ca", label: "Canada", flag: "/images/flag/CA.svg" },
  { value: "fr", label: "France", flag: "/images/flag/FR.svg" },
  { value: "au", label: "Australia", flag: "/images/flag/AU.svg" },
  { value: "it", label: "Italy", flag: "/images/flag/IT.svg" },
  { value: "in", label: "India", flag: "/images/flag/IN.svg" },
];

export default function AccountPage() {
  const [me, setMe] = useState<{ id: string; email: string; name: string; role: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await opsFetch<{ operator: { id: string; email: string; name: string; role: string } }>("/api/admin/me");
      if (cancelled) return;
      if (res.ok && res.data?.operator) {
        setMe(res.data.operator);
        setFullName(res.data.operator.name);
      } else {
        setLoadError(res.error ?? "Failed to load your account");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full Name is required");
      return;
    }
    setSaving(true);
    const res = await opsFetch<{ operator: { name: string } }>("/api/admin/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName }),
    });
    setSaving(false);
    if (res.ok && res.data?.operator) {
      setFullName(res.data.operator.name);
      toast.success("Display name updated");
    } else {
      toast.error(res.error ?? "Failed to save changes");
    }
  }

  async function signOut() {
    const res = await opsFetch("/api/admin/logout", { method: "POST" });
    if (res.ok) {
      window.location.assign("/admin/login");
    } else if (res.status === 0) {
      toast.error("Sign out may not have completed (network error). Try again or close the browser to end the session.");
    } else {
      toast.error(res.error ?? "Sign out failed");
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Details Card */}
      <Card className="bg-transparent p-5">
        <h2 className="mb-6 text-xl leading-7 font-semibold text-text-primary">Account Details</h2>

        {loadError ? (
          <div className="flex flex-wrap items-center gap-3" role="alert">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
            <Button appearance="outline" variant="primary" size="sm" onPress={() => window.location.assign("/admin/profile/account")}>
              Reload page
            </Button>
            <p className="text-xs text-text-tertiary">If your session expired, sign in again from /admin/login.</p>
          </div>
        ) : (
          <Form
            className="space-y-6"
            onSubmit={(event) => void saveChanges(event)}
          >
            <div className="flex items-center gap-4">
              <Avatar size="xxl">
                <AvatarFallback>
                  {me ? me.name.slice(0, 2).toUpperCase() : "S"}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-3">
                  <Button
                    appearance="outline"
                    size="sm"
                    onPress={() => toast.info("Avatar upload is not available in this build — your initials avatar is shown instead")}
                  >
                    Change Avatar
                  </Button>
                  <Button
                    appearance="outline"
                    variant="danger"
                    size="sm"
                    onPress={() => toast.info("Avatar upload is not available in this build — your initials avatar is shown instead")}
                  >
                    Remove
                  </Button>
                </div>
                <p className="text-xs leading-4 text-text-tertiary">
                  Avatar upload is not available yet; your initials avatar is used.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TextField className="w-full gap-2.5">
                <Label>Full Name</Label>
                <Input
                  name="fullName"
                  placeholder="Your name"
                  className="w-full"
                  value={fullName}
                  onChange={(e) => setFullName(e.currentTarget.value)}
                  required
                />
                <FieldError />
              </TextField>

              <TextField className="w-full gap-2.5">
                <Label>Email address</Label>
                <Input
                  name="email"
                  type="email"
                  placeholder={me?.email ? undefined : "You are not signed in"}
                  className="w-full"
                  value={me?.email ?? ""}
                  readOnly
                />
                <FieldError />
              </TextField>

              <TextField className="w-full gap-2.5" disabled readOnly>
                <Label>Phone Number</Label>
                <Input name="phone" placeholder="Not stored in this build" className="w-full" readOnly />
              </TextField>

              <TextField className="w-full gap-2.5" disabled readOnly>
                <Label>Website</Label>
                <InputGroup>
                  <InputGroupAddon className="after h-full border-r border-card-border text-input-placeholder-text-color">
                    https://
                  </InputGroupAddon>
                  <InputGroupInput name="website" placeholder="Not stored in this build" className="pl-2" readOnly />
                </InputGroup>
              </TextField>

              <TextField className="w-full gap-2.5" disabled readOnly>
                <Label>Address</Label>
                <Input name="address" placeholder="Not stored in this build" className="w-full" readOnly />
              </TextField>

              <div>
                <Select name="country" isDisabled className="h-full">
                  <SelectLabel>Country</SelectLabel>
                  <SelectTrigger className="h-full w-full border-input-border">
                    <SelectValue className="flex items-center gap-2" />
                    <SelectIndicator />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((option) => (
                      <SelectItem key={option.value} id={option.value} textValue={option.label}>
                        <span className="flex items-center gap-2">
                          <Image
                            src={option.flag}
                            alt={option.label}
                            width={20}
                            height={20}
                            className="size-5 rounded-full object-cover"
                          />
                          <span>{option.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TextField className="col-span-1 w-full gap-2.5 md:col-span-2" disabled readOnly>
                <Label>Bio</Label>
                <TextArea
                  name="bio"
                  className="h-25 shadow-xs"
                  placeholder="Not stored in this build"
                  readOnly
                />
              </TextField>

              <div className="col-span-1 flex items-center justify-end gap-3 md:col-span-2">
                <Button
                  appearance="outline"
                  variant="primary"
                  size="lg"
                  type="button"
                  className="px-3.5 text-sm"
                  onPress={() => {
                    setFullName(me?.name ?? "");
                    toast.info("Changes reset to your saved name");
                  }}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="lg" type="submit" isDisabled={saving} className="px-3.5 text-sm">
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
              <p className="col-span-1 text-xs leading-4 text-text-tertiary md:col-span-2">
                Your display name is saved to your operator profile. Phone, website, address, bio and country are not
                stored in this build.
              </p>
            </div>
          </Form>
        )}
      </Card>

      <Card className="bg-transparent p-5">
        {/* Sign Out */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm leading-5 font-medium text-text-primary">
              Sign out from all devices
            </p>
            <p className="text-xs leading-4 text-text-tertiary">
              End all active sessions across your devices.
            </p>
          </div>

          <Button
            appearance="outline"
            variant="primary"
            size="lg"
            className="gap-2 px-3.5 py-2 text-sm [&>svg]:size-5"
            onPress={() => void signOut()}
          >
            <LogoutIcon />
            Sign Out
          </Button>
        </div>
        <hr className="my-4 border-border-secondary-alt" />
        {/* Delete Account */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-sm leading-5 font-medium text-text-primary">Delete Account</p>
            <p className="text-xs leading-4 text-text-tertiary">
              Delete your account permanently along with all associated data.
            </p>
          </div>

          <Button
            appearance="outline"
            variant="danger"
            size="lg"
            className="gap-2 px-3.5 py-2 text-sm [&>svg]:size-5"
            onPress={() =>
              toast.info(
                "Self-service deletion is not available. Ask another OWNER to disable this account so the audit history is preserved.",
              )
            }
          >
            <TrashIcon />
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
