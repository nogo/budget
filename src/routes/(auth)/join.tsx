import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { Loader2, Wallet } from "lucide-react";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth/client";
import { env } from "~/lib/env";
import { useTranslation } from "~/locales/translations";
import { JoinSchema } from "~/service/auth.schema";

export const Route = createFileRoute("/(auth)/join")({
  beforeLoad: () => {
    if (!env.VITE_AUTH_ALLOW_REGISTRATION) {
      return redirect({ to: "/" });
    }
  },
  component: Join,
});

function Join() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const t = useTranslation("auth");

  const joinMutation = useMutation({
    mutationFn: join,
    onSuccess: () => {
      queryClient.resetQueries();
      navigate({ to: "/" });
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ formApi, value }) => {
      await joinMutation.mutateAsync(value);
      formApi.reset();
    },
  });

  return (
    <main className="flex justify-center items-center h-screen">
      <div className="md:w-80 md:flex-initial">
        <div className="flex text-yellow-800 justify-center items-center gap-2 text-4xl font-bold capitalize pb-6">
          <Wallet />
          <span>Budget</span>
        </div>

        <form
          className="shadow-md rounded-2xl p-6 bg-white grid grid-cols-1 gap-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="name"
            children={(field) => {
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor={field.name}>{t("name")}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                </div>
              );
            }}
          />
          <form.Field
            name="email"
            children={(field) => {
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor={field.name}>{t("email")}</Label>
                  <Input
                    type="email"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                </div>
              );
            }}
          />

          <form.Field
            name="password"
            children={(field) => {
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor={field.name}>{t("password")}</Label>
                  <Input
                    type="password"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                </div>
              );
            }}
          />

          <form.Field
            name="confirmPassword"
            children={(field) => {
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor={field.name}>{t("confirmPassword")}</Label>
                  <Input
                    type="password"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                </div>
              );
            }}
          />

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full md bg-yellow-800"
              >
                {isSubmitting ? <Loader2 /> : t("join")}
              </Button>
            )}
          />
        </form>

        <div className="p-4 text-center">
          <Link to="/login" className={buttonVariants({ variant: "ghost" })}>
            {t("alreadyRegistered")}
          </Link>
        </div>
      </div>
    </main>
  );
}

const join = async (data: JoinSchema) => {
  const { error } = await authClient.signUp.email({
    name: data.name,
    email: data.email,
    password: data.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
